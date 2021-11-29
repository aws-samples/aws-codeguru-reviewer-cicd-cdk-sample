# CDK TypeScript project to set up the CodeGuru Reviewer CI/CD integration

This repo contains a CDK Stack that sets up [CodeGuru Reviewer GitHub Action](https://github.com/marketplace/actions/codeguru-reviewer) in your AWS account.

## Before we get started

If you do not have the CDK for TypeScript installed, follow the instructions [here](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html) and make sure your credentials are [set up correctly](https://docs.aws.amazon.com/cdk/latest/guide/work-with.html) so you can deploy with CDK.

Once everything is set up correctly, fetch the dependencies and compile:

```
npm install
npm run build
```

## Specify which organizations can use CodeGuru Reviewer

In the file [`./cdk.json`](cdk.json), add all GitHub repositories that should be allowed to use CodeGuru Reviewer in the `allowedGithubRepos` list. For example:
```
"allowedGithubRepos": ["aws-samples/*", "awslabs/smithy"]
```
allows all repositories in the organization `aws-sample` and the repository `awslabs/smithy` to use CodeGuru Reviewer.

## Deploy the Stack to your account

Once you have updated the `allowedGithubRepos`, run the following commands:
```
cdk deploy
```
if you use a named profile, run `cdk deploy --profile {PROFILE-NAME}` instead.
After the deployment completes, you will receive an output like this:

```
 ✅  GuruCdkSetupStack

Outputs:
GuruCdkSetupStack.Role = arn:aws:iam::123456789012:role/GitHubActionRole
GuruCdkSetupStack.Region = us-east-1
GuruCdkSetupStack.Bucket = codeguru-reviewer-build-artifacts-123456789012-us-east-1
```

## Add the Action to your GitHub repositories

You can use the following template for your Action:

```
# Add this file to your .github/workflows directory
name: Analyze with CodeGuru Reviewer
on: [pull_request]
permissions:
    id-token: write
    contents: read
    security-events: write 

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 0

# Add your build instructions here. E.g., setup java and run a Gralde build.

    - name: Configure AWS credentials from Test account
      uses: aws-actions/configure-aws-credentials@v1
      with:
        role-to-assume: {ROLE_ARN}
        aws-region: {REGION}

    - name: CodeGuru Reviewer
      uses: aws-actions/codeguru-reviewer@v1.1
      continue-on-error: false
      with:          
        s3_bucket: {BUCKET_NAME}
        # build_path: ./build/libs # Set a build directory if you want security findings for Java.

    - name: Upload review result
      uses: github/codeql-action/upload-sarif@v1
      with:
        sarif_file: codeguru-results.sarif.json
```

Replace the strings `{ROLE_ARN}`, `{REGION}`, and `{BUCKET_NAME}` with the values that you received as output from CDK.

For Java, you should also add build instructions before the CodeGuru step and set the build folder in the CodeGuru Action to receive security recommendations.

For more information, see the [CodeGuru Reviewer documentation](https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/working-with-cicd.html).

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
