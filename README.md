# CDK TypeScript project to set up the CodeGuru Reviewer CI/CD integration

This repo contains a CDK Stack that sets up [CodeGuru Reviewer GitHub Action](https://github.com/marketplace/actions/codeguru-reviewer) in your AWS account for CI/CD integration in GitHub. It sets up the correct permissions for using CodeGuru Reviewer as well as creating an S3 bucket that holds the code and build artifacts for analysis by CodeGuru Reivewer.

## Before we get started

If you do not have the CDK for TypeScript installed, follow the instructions [here](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html) and make sure your credentials are [set up correctly](https://docs.aws.amazon.com/cdk/latest/guide/work-with.html) so you can deploy with CDK. The steps include:

```
npm install typescript aws-cdk
```

Once everything is set up correctly, fetch the dependencies and compile:

```
git clone https://github.com/aws-samples/aws-codeguru-reviewer-cicd-cdk-sample.git
cd aws-codeguru-reviewer-cicd-cdk-sample
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

Once you have updated the `allowedGithubRepos`, you need bootstrap CDK and deploy the stack.

#### 1) CDK Bootstrap
Run the command:
```
npx cdk bootstrap --profile {PROFILE_NAME} "aws://unknown-account/unknown-region"
```
- Replace `PROFILE_NAME` with one of the named profiles in your `~/.aws/config` file.
- No need to replace the text in quotes. You can literally use `"aws://unknown-account/unknown-region"`.
- You only need to boostrap once.

#### 2) CDK Deploy

Run the command:
```
npx cdk deploy --profile {PROFILE_NAME}
```
- Replace `PROFILE_NAME` with one of the named profiles in your `~/.aws/config` file.

#### 3) Take note of the created resource names

Once the deployment completes, you will receive an output similar to this:

```
 ✅  GuruCdkSetupStack

Outputs:
GuruCdkSetupStack.Role = arn:aws:iam::123456789012:role/GitHubActionRole
GuruCdkSetupStack.Region = us-east-1
GuruCdkSetupStack.Bucket = codeguru-reviewer-build-artifacts-123456789012-us-east-1
```

You will need this information in your GitHub workflow:
- You will use the **Role ARN** and **Region** when calling the `configure-aws-credentials` action.
- You will use the **Bucket name** when calling the `codeguru-reviewer` action.


## Add the workflow to your GitHub repositories

You can use one of the following templates for your workflow:


### Example for a Java project that builds with Gradle
```
name: Analyze with CodeGuru Reviewer

on: 
 - push
 - workflow_dispatch # This allows manual triggering of the action through the GitHub UI.

permissions:
    id-token: write
    contents: read
    security-events: write 

jobs:
  analyze:
    name: Analyze with CodeGuru Reviewer
    runs-on: ubuntu-latest
    steps:
    - name: Configure AWS credentials
      id: iam-role
      continue-on-error: true
      uses: aws-actions/configure-aws-credentials@v1
      with:
        role-to-assume: {ROLE_ARN}
        aws-region: {REGION}
    
    - uses: actions/checkout@v2
      if: steps.iam-role.outcome == 'success'
      with:
        fetch-depth: 0
    - name: Set up JDK 1.8
      if: steps.iam-role.outcome == 'success'
      uses: actions/setup-java@v1
      with:
        java-version: 1.8
    - name: Build project
      if: steps.iam-role.outcome == 'success'
      run: ./gradlew jar -x test

    - name: CodeGuru Reviewer
      uses: aws-actions/codeguru-reviewer@v1.1
      if: steps.iam-role.outcome == 'success'
      continue-on-error: false
      with:          
        s3_bucket: {BUCKET_NAME}
        build_path: ./target/classes

    - name: Upload review result
      if: steps.iam-role.outcome == 'success'
      uses: github/codeql-action/upload-sarif@v1
      with:
        sarif_file: codeguru-results.sarif.json
```

Replace the strings `{ROLE_ARN}`, `{REGION}`, and `{BUCKET_NAME}` with the values that you received as output from CDK.

These examples uses GitHub's Code Scanning feature to display the recommendations. **If you are using a private repository without paying for Code Scanning, this will fail**. Before you
can use this feature, you need to enable GitHub Code Scanning for your repository or organization (see [documentation](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/setting-up-code-scanning-for-a-repository)).
If you are not planning on using this feature, omit the `Upload review result` part.

### Example for a Python project
```
name: Analyze with CodeGuru Reviewer

on: 
 - push
 - workflow_dispatch # This allows manual triggering of the action through the GitHub UI.

permissions:
    id-token: write
    contents: read

jobs:
  analyze:
    name: Analyze with CodeGuru Reviewer
    runs-on: ubuntu-latest
    steps:
    - name: Configure AWS credentials
      id: iam-role
      continue-on-error: true
      uses: aws-actions/configure-aws-credentials@v1
      with:
        role-to-assume: {ROLE_ARN}
        aws-region: {REGION}
    
    - uses: actions/checkout@v2
      if: steps.iam-role.outcome == 'success'
      with:
        fetch-depth: 0

    - name: CodeGuru Reviewer
      uses: aws-actions/codeguru-reviewer@v1.1
      if: steps.iam-role.outcome == 'success'
      continue-on-error: false
      with:          
        s3_bucket: {BUCKET_NAME}
        
    - name: Store SARIF file
      if: steps.iam-role.outcome == 'success'
      uses: actions/upload-artifact@v2
      with:
        name: SARIF_recommendations
        path: ./codeguru-results.sarif.json
```

Replace the strings `{ROLE_ARN}`, `{REGION}`, and `{BUCKET_NAME}` with the values that you received as output from CDK.

Here, instead of uploading the artifacts to GitHubs security tab, we store them as artifacs of the CICD run. 
This allows anyone with access to the repository to download the recommendations in SARIF format.


You can also see all recommendations in you AWS Console.

For more information, see the [CodeGuru Reviewer documentation](https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/working-with-cicd.html).

Note that only allow-listed organizations and repositories can assume the IAM Role to run CodeGuru Reviewer.
For this reason, we recommend that you run the CodeGuru Reviewer Action only on `push` events. The action will
only succeed on `pull_requests` if the repository from which the `pull_request` originated is also part of the
allow list.

Further, to avoid failures of the Action for users who fork this repository, we label the Role assumption step
with `id: iam-role` and guard all other workflow steps with:
```
if: steps.iam-role.outcome == 'success'
```
so they do not get executed if the fork is not allowed to assume the Role.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
