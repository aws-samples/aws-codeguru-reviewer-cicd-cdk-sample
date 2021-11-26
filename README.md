# CDK TypeScript project to set up the CodeGuru Reviewer CI/CD integration


## Before we get started

If you do not have the CDK for TypeScript installed, follow the instructions [here](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html) and make sure your credentials are [set up correctly](https://docs.aws.amazon.com/cdk/latest/guide/work-with.html) so you can deploy with CDK.

## Specify which organizations can use CodeGuru Reviewer

In the file [`./cdk.json`](cdk.json), add all GitHub organizations or users that should be allowed to use CodeGuru Reviewer in the `allowListedGithubOrgs` list. For example:
```
"allowListedGithubOrgs": ["awslabs", "aws-samples", "alexa"]
```

## Deploy the Stack to your account

Once you have updated the `allowListedGithubOrgs`, run the following commands:
```
npm run build
cdk deploy
```
and you will receive an output like this:

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
    contents: write
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
      uses: aws-actions/configure-aws-credentials@master
      with:
        role-to-assume: {ROLE}
        aws-region: {REGION}

    - name: CodeGuru Reviewer
      uses: aws-actions/codeguru-reviewer@v1.1
      continue-on-error: false
      with:          
        s3_bucket: {BUCKET}
        # build_path: ./build/libs # Set a build directory if you want security findings for Java.

    - name: Upload review result
      uses: github/codeql-action/upload-sarif@v1
      with:
        sarif_file: codeguru-results.sarif.json
```

Replace the strings `{ROLE}`, `{REGION}`, and `{BUCKET}` with the values that you received as output from CDK.

For Java, you should also add build instructions before the CodeGuru step and set the build folder in the CodeGuru Action to receive security recommendations.

For more information, see the [CodeGuru Reviewer documentation](https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/working-with-cicd.html).