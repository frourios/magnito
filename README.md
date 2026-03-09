# Magnito

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://frourios.github.io/magnito/logos/icon-text-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://frourios.github.io/magnito/logos/icon-text-light.svg">
  <img alt="Magnito logo image" src="https://frourios.github.io/magnito/logos/icon-text-light.svg">
</picture>

![Docker Pulls](https://img.shields.io/docker/pulls/frourio/magnito)
![Docker Image Size (latest by date)](https://img.shields.io/docker/image-size/frourio/magnito)
![Docker Image Version (latest by date)](https://img.shields.io/docker/v/frourio/magnito)

Free, and open Amazon Cognito emulator for Amplify UI

Running your Amplify UI locally without AWS Cognito.

## Images

Docker Hub - <https://hub.docker.com/r/frourio/magnito>

Amazon ECR Public Gallery - <https://gallery.ecr.aws/frourio/magnito>

## Usage

Docker Compose

`compose.yml`

```yml
services:
  magnito:
    image: frourio/magnito:latest
    ports:
      - 5050:5050 # Cognito API
      - 5051:5051 # web interface
      - 5052:5052 # OAuth2 SSL endpoint
    environment:
      COGNITO_USER_POOL_ID: ap-northeast-1_example
      COGNITO_USER_POOL_CLIENT_ID: example-client-name
      COGNITO_ACCESS_KEY: magnito-access-key
      COGNITO_SECRET_KEY: magnito-secret-key
      COGNITO_REGION: ap-northeast-1
      SMTP_HOST: inbucket
      SMTP_PORT: 2500
      SMTP_USER: fake_mail_user
      SMTP_PASS: fake_mail_password
    volumes:
      - magnito:/usr/src/app/data

  inbucket:
    image: inbucket/inbucket:3.0.3
    ports:
      - 2500:2500 # SMTP
      - 9000:9000 # web interface
    volumes:
      - inbucket:/storage

volumes:
  magnito:
    driver: local
  inbucket:
    driver: local
```

### Web UI

You can access the Magnito web interface at <http://localhost:5051>.

### SMTP Server UI

You can check the emails sent by Magnito with Inbucket.

[Inbucket](https://inbucket.org) - <http://localhost:9000/>

## Screenshots

| Sign Up                                                                                | Sign In                                                                                |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| ![Sign Up](https://frourios.github.io/magnito/screenshots/sign-up.png)                 | ![Sign In](https://frourios.github.io/magnito/screenshots/sign-in.png)                 |
| Forgot Password                                                                        | Admin                                                                                  |
| ![Forgot Password](https://frourios.github.io/magnito/screenshots/forgot-password.png) | ![Admin](https://frourios.github.io/magnito/screenshots/admin.png)                     |
| Profile                                                                                | Change Password                                                                        |
| ![Profile](https://frourios.github.io/magnito/screenshots/profile.png)                 | ![Change Password](https://frourios.github.io/magnito/screenshots/change-password.png) |

## Features

- Sign Up

  - Create a new user account by entering an email address and password.
  - Passwords must have at least 8 characters, at least one uppercase letter, at least one lowercase letter, at least one number, and at least one special character.

- Sign In

  - Sign in with your email address and password.
  - Sign in with Google / Apple / Amazon / Facebook emulators.
  - Support MFA with TOTP.

- Forgot Password

  - Send a password reset email to the email address you registered with.

- Reset Password

  - Reset your password by entering a old password and a new password.

- Admin

  - List all user information.

- Profile
  - Check your user information.

## Implementation Coverage

[IMPLEMENTATION_COVERAGE](IMPLEMENTATION_COVERAGE.md)

## License

[MIT](LICENSE)
