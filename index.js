#!/usr/bin/env node
// @flow

const core = require('@actions/core');
const { context } = require('@actions/github');
const Octokit = require('@octokit/rest').Octokit;

const run = async () => {
    const { GITHUB_TOKEN } = process.env;
    const workflows = core.getInput('workflows');
    if (!workflows) {
        core.setFailed('No `workflows` input given, aborting.');
        return;
    }

    const names =
        typeof workflows === 'string'
            ? workflows.split(',').map(m => m.trim())
            : workflows;

    if (!GITHUB_TOKEN) {
        core.setFailed('GITHUB_TOKEN env variable is required');
        return;
    }

    const client = new Octokit({ auth: `token ${GITHUB_TOKEN}` });

    const pullRequest = context.payload.pull_request;
    const { owner, repo } = context.repo;

    const runsAndWorkflows = await Promise.all(
        names.map(async name => {
            console.log('Checking', name, process.env.GITHUB_HEAD_REF);
            try {
                const workflow = await client.actions.getWorkflow({
                    owner,
                    repo,
                    workflow_id: name,
                });

                const runs = await client.actions.listWorkflowRuns({
                    owner,
                    repo,
                    workflow_id: workflow.data.id,
                    branch: process.env.GITHUB_HEAD_REF,
                    event: 'pull_request',
                    status: 'in_progress',
                });
                return { workflow, runs };
            } catch (err) {
                console.error(err);
                console.log('failed');
                return null;
            }
        }),
    );
    const latestPullRequestData = await client.pulls.get({
        owner,
        repo,
        pull_number: pullRequest.number,
    });

    if (latestPullRequestData.data.head.sha !== pullRequest.head.sha) {
        // There are more recent commits than the one we're on! Bail now.
        console.log(
            'Bailing, there are more recent commits on this pull-request',
            latestPullRequestData.data.head.sha,
            pullRequest.head.sha,
        );
        return;
    }
    for (const { workflow, runs } of runsAndWorkflows.filter(Boolean)) {
        for (const run of runs.data.workflow_runs) {
            console.log('Currently running', run.id);
            let samePr = false;
            for (const pr of run.pull_requests) {
                console.log(pr.url, pr.number);
                if (pr.number === pullRequest.number) {
                    samePr = true;
                }
            }

            // The run is behind!
            if (samePr && run.head_sha !== pullRequest.head.sha) {
                console.log(
                    'Cancelling!',
                    run.head_sha,
                    process.env.GITHUB_SHA,
                    pullRequest.head.sha,
                );
                await client.actions.cancelWorkflowRun({
                    owner,
                    repo,
                    run_id: run.id,
                });
            }
        }
    }
};

run().catch(err => {
    console.error(err);
    process.exit(1);
});
