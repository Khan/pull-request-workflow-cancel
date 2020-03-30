# Pull Request Workflow Cancel

Conserve resources by cancelling workflow runs for previous commits on a pull-request.
This differs from other "workflow cancelling" actions in that it allows you to cancel multiple workflows at once, and in that it's a javascript action (not a docker action), so it works on macos as well as linux, and executes extremely quickly.

Example usage:
```yaml
name: Pull Request Workflow Cancel Example
on: [pull_request]

jobs:
  hello:
    runs-on: ubuntu-latest
    steps:
      - uses: khan/pull-request-workflow-cancel@master
        with:
          workflows: "example.yml | second.yml"
        env:
          GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}'
      # Now do whatever other stuff
      - uses: actions/checkout@v2
      - run: echo 'Running now'
      - run: sleep 30
      - run: echo 'wasnt cancelled'
```
