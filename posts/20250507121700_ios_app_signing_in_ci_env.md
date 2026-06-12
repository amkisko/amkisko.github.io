# iOS App Signing and Certificates Management in CI Environment

URL: https://amkisko.github.io/posts/20250507121700_ios_app_signing_in_ci_env.html
Description: A comprehensive guide to managing iOS app signing certificates and provisioning profiles in a CI environment. Learn about certificate creation, profile management, and automated deployment workflows.
Date: May 7, 2024
Published: 2024-05-07T12:17:00+00:00

---

Managing iOS app signing certificates and provisioning profiles in a CI environment can be challenging. This guide will walk you through the process of setting up and maintaining certificates for automated builds, with a focus on Flutter applications.

Important:

## Certificate Creation and Management

When working with iOS certificates, there are several key points to remember:

Attention:

To create a new certificate:

1. Open Xcode
2. Go to Xcode → Settings → Accounts
3. Select your Apple Developer account
4. Click "Manage Certificates"
5. Click "+" and select "Apple Distribution"

## Exporting Certificates

To export your certificate and private key:

1. Open Keychain Access (Applications → Utilities → Keychain Access)
2. Select the "login" keychain
3. Find your "Apple Distribution" certificate
4. Right-click and select "Export"
5. Save as a .p12 file (e.g., MyApp_2025.p12)

Security Note:

`-t agg`

## Flutter Workflow

Before proceeding with any build operations, ensure your Flutter environment is up to date:

```
flutter upgrade
flutter pub get && flutter pub upgrade
flutter clean && flutter pub cache clean
flutter build ios
```

## Managing Certificates in CI

Here's a script to import certificates from 1Password in your CI environment:

```
op_vault="MyApp"
op_document="MyApp AppStore Certificate Profiles $YEAR"
op_item_id=$(op item list --vault "$op_vault" | grep "$op_document" | awk '{print $1}')
tmp_path="/tmp/myapp_certs_$(date +%Y%m%d)"
mkdir -p $tmp_path
tmp_p12_path="$tmp_path/profile.p12"
p12_base64=$(op item get $op_item_id --field "$p12_filename" --reveal)
p12_password=$(op item get $op_item_id --field "password" --reveal)
echo "$p12_base64" | base64 --decode > $tmp_p12_path
security import $tmp_p12_path -P "$p12_password" -A -t agg -k ~/Library/Keychains/login.keychain-db
rm -rf $tmp_path
```

## GitHub Actions Integration

For automated builds, you'll need to set up GitHub Actions secrets:

1. Store your certificate in GitHub Secrets as base64
2. Store the certificate password
3. Store the provisioning profile

Here's how to update GitHub Actions secrets:

```
#!/bin/bash
# Update GitHub Actions secrets
# Replace myorg/myapp with your GitHub repository
# Replace MyApp with your app name
# Replace YEAR with current year (e.g., 2024)

YEAR=$(date +%Y)
github_repo="myorg/myapp"
github_dev_env="Flutter iPhone dev"
github_production_env="Flutter iPhone production"

op_vault="MyApp"
op_document="MyApp AppStore Certificate Profiles $YEAR"
op_item_id=$(op item list --vault "$op_vault" | grep "$op_document" | awk '{print $1}')

p12_filename="MyApp_$YEAR.p12"
dev_profile_filename="MyApp_dev_$YEAR.mobileprovision"
production_profile_filename="MyApp_production_$YEAR.mobileprovision"

p12_base64=$(op item get $op_item_id --field "$p12_filename" --reveal)
p12_password=$(op item get $op_item_id --field "password" --reveal)
dev_profile_base64=$(op item get $op_item_id --field "$dev_profile_filename" --reveal)
production_profile_base64=$(op item get $op_item_id --field "$production_profile_filename" --reveal)

# Update development environment secrets
gh secret set IOS_BUILD_CERTIFICATE_BASE64 --repo "$github_repo" --body "$p12_base64" --env "$github_dev_env"
gh secret set IOS_BUILD_CERTIFICATE_P12_PASSWORD --repo "$github_repo" --body "$p12_password" --env "$github_dev_env"
gh secret set IOS_BUILD_PROVISION_PROFILE_BASE64 --repo "$github_repo" --body "$dev_profile_base64" --env "$github_dev_env"

# Update production environment secrets
gh secret set IOS_BUILD_CERTIFICATE_BASE64 --repo "$github_repo" --body "$p12_base64" --env "$github_production_env"
gh secret set IOS_BUILD_CERTIFICATE_P12_PASSWORD --repo "$github_repo" --body "$p12_password" --env "$github_production_env"
gh secret set IOS_BUILD_PROVISION_PROFILE_BASE64 --repo "$github_repo" --body "$production_profile_base64" --env "$github_production_env"
```

## Building the App

To build the app, you might need to clean the environment first:

```
pod install --repo-update
flutter clean && flutter pub cache clean
flutter analyze
flutter pub get
flutter build ios
```

For creating an IPA file:

```
flutter build ipa --release \
  --export-options-plist=ios/exportOptions_${environment}.plist \
  --flavor ${environment} \
  -t lib/main_${environment}.dart
```

## Best Practices

- Always use Xcode for certificate creation
- Keep certificates and profiles in a secure password manager
- Regularly rotate certificates before they expire
- Use separate certificates for development and production
- Implement proper error handling in CI scripts

## GitHub Actions Workflow Configuration

Here's a complete example of a GitHub Actions workflow for building and deploying iOS apps:

```
name: __flutter-build-ios

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      app_version:
        required: true
        type: string
      release_upload_url:
        required: false
        type: string
    outputs:
      result:
        description: Build job result code
        value: ${{ jobs.build.outputs.result }}

jobs:
  setup:
    runs-on: ubuntu-latest
    timeout-minutes: 1
    env:
      environment: ${{ (inputs || github.event.inputs).environment }}
      app_version: ${{ (inputs || github.event.inputs).app_version }}
      release_upload_url: ${{ (inputs || github.event.inputs).release_upload_url }}
    outputs:
      environment: ${{ env.environment }}
      app_version: ${{ env.app_version || steps.variables.outputs.app_version }}
      release_upload_url: ${{ env.release_upload_url }}
      random_string: ${{ steps.variables.outputs.random_string }}
    steps:
      - uses: actions/checkout@v4
      - id: variables
        run: |
          echo "app_version=${{ env.environment }}-$(date +'%Y%m%d%H%m%S')" >> $GITHUB_OUTPUT
          echo "random_string=$(openssl rand -base64 32)" >> $GITHUB_OUTPUT

  build:
    needs: [setup]
    runs-on: macos-15
    timeout-minutes: 20
    outputs:
      result: ${{ steps.result.outputs.value }}
    environment: Flutter iOS Build ${{ needs.setup.outputs.environment }}
    env:
      IPA_MASK: MyApp*.ipa
      RELEASE_ASSET_NAME: myapp
      RELEASE_PROFILE: MyApp ${{ needs.setup.outputs.environment }}
      IPA_BUILD_PATH: build/ios/ipa
      RELEASE_FLAVOR: ${{ needs.setup.outputs.environment }}
      RELEASE_VERSION: ${{ needs.setup.outputs.app_version }}
      RELEASE_UPLOAD_URL: ${{ needs.setup.outputs.release_upload_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Configure Apple certificate and provisioning profile
        env:
          IOS_BUILD_CERTIFICATE_BASE64: ${{ secrets.IOS_BUILD_CERTIFICATE_BASE64 }}
          IOS_BUILD_CERTIFICATE_P12_PASSWORD: ${{ secrets.IOS_BUILD_CERTIFICATE_P12_PASSWORD }}
          IOS_BUILD_PROVISION_PROFILE_BASE64: ${{ secrets.IOS_BUILD_PROVISION_PROFILE_BASE64 }}
          IOS_KEYCHAIN_PASSWORD: ${{ needs.setup.outputs.random_string }}
        run: |
          # Certificate and profile setup script
          set -e
          cd ios
          CERTIFICATE_PATH=$RUNNER_TEMP/build_certificate.p12
          PP_PATH=$RUNNER_TEMP/build_pp.mobileprovision
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db

          # Create and configure keychain
          security create-keychain -p "$IOS_KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$IOS_KEYCHAIN_PASSWORD" $KEYCHAIN_PATH

          # Import certificate
          echo -n "$IOS_BUILD_CERTIFICATE_BASE64" | base64 --decode --output $CERTIFICATE_PATH
          security import $CERTIFICATE_PATH -P "$IOS_BUILD_CERTIFICATE_P12_PASSWORD" \
            -A -t agg -k $KEYCHAIN_PATH \
            -T /usr/bin/codesign \
            -T /usr/bin/security

          # Install provisioning profile
          echo -n "$IOS_BUILD_PROVISION_PROFILE_BASE64" | base64 --decode --output $PP_PATH
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          cp $PP_PATH ~/Library/MobileDevice/Provisioning\ Profiles/

          cd ..
      - name: Build IPA
        run: |
          flutter build ipa --release \
            --export-options-plist=ios/exportOptions_${RELEASE_FLAVOR}.plist \
            --flavor ${RELEASE_FLAVOR} \
            -t lib/main_${RELEASE_FLAVOR}.dart
```

## Flutter App Configuration

Here are the essential configuration files for a Flutter iOS app:

### Podfile Configuration

```
# ios/Podfile
# Replace '15.0' with your minimum iOS version

platform :ios, '15.0'

ENV['COCOAPODS_DISABLE_STATS'] = 'true'

project 'Runner', {
  'Debug' => :debug,
  'Profile' => :release,
  'Release' => :release,
}

def flutter_root
  generated_xcode_build_settings_path = File.expand_path(File.join('..', 'Flutter', 'Generated.xcconfig'), __FILE__)
  unless File.exist?(generated_xcode_build_settings_path)
    raise "#{generated_xcode_build_settings_path} must exist. If you're running pod install manually, make sure flutter pub get is executed first"
  end

  File.foreach(generated_xcode_build_settings_path) do |line|
    matches = line.match(/FLUTTER_ROOT\=(.*)/)
    return matches[1].strip if matches
  end
  raise "FLUTTER_ROOT not found in #{generated_xcode_build_settings_path}. Try deleting Generated.xcconfig, then run flutter pub get"
end

require File.expand_path(File.join('packages', 'flutter_tools', 'bin', 'podhelper'), flutter_root)

flutter_ios_podfile_setup

target 'Runner' do
  use_frameworks!
  use_modular_headers!

  flutter_install_all_ios_pods File.dirname(File.realpath(__FILE__))
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)

    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
      config.build_settings['ENABLE_BITCODE'] = 'NO'
      config.build_settings['ARCHS'] = 'arm64'
    end
  end
end
```

### Export Options Configuration

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>destination</key>
    <string>export</string>
    <key>manageAppVersionAndBuildNumber</key>
    <true/>
    <key>method</key>
    <string>app-store-connect</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>signingCertificate</key>
    <string>Apple Distribution: My Company (XXXYYY123)</string>
    <key>provisioningProfiles</key>
    <dict>
      <key>com.myapp.ios.dev</key>
      <string>MyApp dev</string>
    </dict>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>teamID</key>
    <string>XXXYYY123</string>
    <key>compileBitcode</key>
    <true/>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
  </dict>
</plist>
```

### Fastlane Configuration

```
# fastlane/Fastfile
default_platform(:ios)

platform :ios do
  lane :release do
    app_store_connect_api_key(
      key_id: options[:key_id],
      issuer_id: options[:issuer_id],
      key_content: options[:key_content],
      duration: 1_200,
      in_house: false
    )

    deliver(
      ipa: options[:ipa],
      submit_for_review: false,
      automatic_release: true,
      force: true,
      skip_metadata: true,
      skip_screenshots: true,
      submission_information: {
        add_id_info_limits_tracking: true,
        add_id_info_serves_ads: false,
        add_id_info_tracks_action: true,
        add_id_info_tracks_install: true,
        add_id_info_uses_idfa: true,
        content_rights_has_rights: true,
        content_rights_contains_third_party_content: true,
        export_compliance_platform: "ios",
        export_compliance_compliance_required: false,
        export_compliance_encryption_updated: false,
        export_compliance_app_type: nil,
        export_compliance_uses_encryption: false,
        export_compliance_is_exempt: false,
        export_compliance_contains_third_party_cryptography: false,
        export_compliance_contains_proprietary_cryptography: false
      }
    )
  end

  lane :publish_to_testflight do |options|
    app_store_connect_api_key(
      key_id: options[:key_id],
      issuer_id: options[:issuer_id],
      key_content: options[:key_content],
      duration: 1_200,
      in_house: false
    )

    upload_to_testflight(
      ipa: options[:ipa],
      reject_build_waiting_for_review: true,
      skip_waiting_for_build_processing: true,
      distribute_external: true,
      notify_external_testers: true,
      groups: options[:groups],
      changelog: options[:changelog] || "Automatic release"
    )
  end
end
```

Note:

`MyApp`

`XXXYYY123`

## Ready-to-Use Code Snippets

Below are the essential code snippets you can copy and use in your project. Each section is self-contained and includes necessary context.

### 1. Import Certificate from 1Password

```
#!/bin/bash
# Import certificate from 1Password
# Replace MyApp with your app name
# Replace YEAR with current year (e.g., 2024)

YEAR=$(date +%Y)
op_vault="MyApp"
op_document="MyApp AppStore Certificate Profiles $YEAR"
op_item_id=$(op item list --vault "$op_vault" | grep "$op_document" | awk '{print $1}')
tmp_path="/tmp/myapp_certs_$(date +%Y%m%d)"
mkdir -p $tmp_path
tmp_p12_path="$tmp_path/profile.p12"
p12_base64=$(op item get $op_item_id --field "$p12_filename" --reveal)
p12_password=$(op item get $op_item_id --field "password" --reveal)
echo "$p12_base64" | base64 --decode > $tmp_p12_path
security import $tmp_p12_path -P "$p12_password" -A -t agg -k ~/Library/Keychains/login.keychain-db
rm -rf $tmp_path
```

### 2. Update GitHub Actions Secrets

```
#!/bin/bash
# Update GitHub Actions secrets
# Replace myorg/myapp with your GitHub repository
# Replace MyApp with your app name
# Replace YEAR with current year (e.g., 2024)

YEAR=$(date +%Y)
github_repo="myorg/myapp"
github_dev_env="Flutter iPhone dev"
github_production_env="Flutter iPhone production"

op_vault="MyApp"
op_document="MyApp AppStore Certificate Profiles $YEAR"
op_item_id=$(op item list --vault "$op_vault" | grep "$op_document" | awk '{print $1}')

p12_filename="MyApp_$YEAR.p12"
dev_profile_filename="MyApp_dev_$YEAR.mobileprovision"
production_profile_filename="MyApp_production_$YEAR.mobileprovision"

p12_base64=$(op item get $op_item_id --field "$p12_filename" --reveal)
p12_password=$(op item get $op_item_id --field "password" --reveal)
dev_profile_base64=$(op item get $op_item_id --field "$dev_profile_filename" --reveal)
production_profile_base64=$(op item get $op_item_id --field "$production_profile_filename" --reveal)

# Update development environment secrets
gh secret set IOS_BUILD_CERTIFICATE_BASE64 --repo "$github_repo" --body "$p12_base64" --env "$github_dev_env"
gh secret set IOS_BUILD_CERTIFICATE_P12_PASSWORD --repo "$github_repo" --body "$p12_password" --env "$github_dev_env"
gh secret set IOS_BUILD_PROVISION_PROFILE_BASE64 --repo "$github_repo" --body "$dev_profile_base64" --env "$github_dev_env"

# Update production environment secrets
gh secret set IOS_BUILD_CERTIFICATE_BASE64 --repo "$github_repo" --body "$p12_base64" --env "$github_production_env"
gh secret set IOS_BUILD_CERTIFICATE_P12_PASSWORD --repo "$github_repo" --body "$p12_password" --env "$github_production_env"
gh secret set IOS_BUILD_PROVISION_PROFILE_BASE64 --repo "$github_repo" --body "$production_profile_base64" --env "$github_production_env"
```

### 3. Flutter Build Commands

```
#!/bin/bash
# Flutter build commands
# Replace ${environment} with your environment (e.g., dev, production)

# Clean and update
flutter upgrade
flutter pub get && flutter pub upgrade
flutter clean && flutter pub cache clean

# Build iOS app
flutter build ios

# Build IPA
flutter build ipa --release \
  --export-options-plist=ios/exportOptions_${environment}.plist \
  --flavor ${environment} \
  -t lib/main_${environment}.dart
```

### 4. Podfile Configuration

```
# ios/Podfile
# Replace '15.0' with your minimum iOS version

platform :ios, '15.0'

ENV['COCOAPODS_DISABLE_STATS'] = 'true'

project 'Runner', {
  'Debug' => :debug,
  'Profile' => :release,
  'Release' => :release,
}

def flutter_root
  generated_xcode_build_settings_path = File.expand_path(File.join('..', 'Flutter', 'Generated.xcconfig'), __FILE__)
  unless File.exist?(generated_xcode_build_settings_path)
    raise "#{generated_xcode_build_settings_path} must exist. If you're running pod install manually, make sure flutter pub get is executed first"
  end

  File.foreach(generated_xcode_build_settings_path) do |line|
    matches = line.match(/FLUTTER_ROOT\=(.*)/)
    return matches[1].strip if matches
  end
  raise "FLUTTER_ROOT not found in #{generated_xcode_build_settings_path}. Try deleting Generated.xcconfig, then run flutter pub get"
end

require File.expand_path(File.join('packages', 'flutter_tools', 'bin', 'podhelper'), flutter_root)

flutter_ios_podfile_setup

target 'Runner' do
  use_frameworks!
  use_modular_headers!

  flutter_install_all_ios_pods File.dirname(File.realpath(__FILE__))
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)

    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
      config.build_settings['ENABLE_BITCODE'] = 'NO'
      config.build_settings['ARCHS'] = 'arm64'
    end
  end
end
```

### 5. Export Options Configuration

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>destination</key>
    <string>export</string>
    <key>manageAppVersionAndBuildNumber</key>
    <true/>
    <key>method</key>
    <string>app-store-connect</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>signingCertificate</key>
    <string>Apple Distribution: My Company (XXXYYY123)</string>
    <key>provisioningProfiles</key>
    <dict>
      <key>com.myapp.ios.dev</key>
      <string>MyApp dev</string>
    </dict>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>teamID</key>
    <string>XXXYYY123</string>
    <key>compileBitcode</key>
    <true/>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
  </dict>
</plist>
```

### 6. Fastlane Configuration

```
# fastlane/Fastfile
default_platform(:ios)

platform :ios do
  lane :release do
    app_store_connect_api_key(
      key_id: options[:key_id],
      issuer_id: options[:issuer_id],
      key_content: options[:key_content],
      duration: 1_200,
      in_house: false
    )

    deliver(
      ipa: options[:ipa],
      submit_for_review: false,
      automatic_release: true,
      force: true,
      skip_metadata: true,
      skip_screenshots: true,
      submission_information: {
        add_id_info_limits_tracking: true,
        add_id_info_serves_ads: false,
        add_id_info_tracks_action: true,
        add_id_info_tracks_install: true,
        add_id_info_uses_idfa: true,
        content_rights_has_rights: true,
        content_rights_contains_third_party_content: true,
        export_compliance_platform: "ios",
        export_compliance_compliance_required: false,
        export_compliance_encryption_updated: false,
        export_compliance_app_type: nil,
        export_compliance_uses_encryption: false,
        export_compliance_is_exempt: false,
        export_compliance_contains_third_party_cryptography: false,
        export_compliance_contains_proprietary_cryptography: false
      }
    )
  end

  lane :publish_to_testflight do |options|
    app_store_connect_api_key(
      key_id: options[:key_id],
      issuer_id: options[:issuer_id],
      key_content: options[:key_content],
      duration: 1_200,
      in_house: false
    )

    upload_to_testflight(
      ipa: options[:ipa],
      reject_build_waiting_for_review: true,
      skip_waiting_for_build_processing: true,
      distribute_external: true,
      notify_external_testers: true,
      groups: options[:groups],
      changelog: options[:changelog] || "Automatic release"
    )
  end
end
```

Note:

`MyApp`

`XXXYYY123`

## Configuration Placeholders and Settings

When setting up your iOS app signing in CI, you'll need to replace several placeholder values with your actual configuration. Here's a detailed breakdown:

### GitHub Configuration

GitHub Organization and Repository:

- `myorg/myapp` - Replace with your GitHub organization and repository name (e.g., `acme/my-awesome-app`)
- `Flutter iPhone dev` - Your GitHub environment name for development builds
- `Flutter iPhone production` - Your GitHub environment name for production builds

### 1Password Configuration

1Password Vault and Document Settings:

- `MyApp` - Your 1Password vault name where certificates are stored
- `MyApp AppStore Certificate Profiles $YEAR` - Document name pattern in 1Password (e.g., `MyApp AppStore Certificate Profiles 2024`)
- `MyApp_$YEAR.p12` - Certificate filename pattern (e.g., `MyApp_2024.p12`)
- `MyApp_dev_$YEAR.mobileprovision` - Development profile filename pattern
- `MyApp_production_$YEAR.mobileprovision` - Production profile filename pattern

### Apple Developer Account Settings

Apple Developer Portal Configuration:

- `XXXYYY123` - Your Apple Developer Team ID (found in Apple Developer account)
- `Apple Distribution: My Company (XXXYYY123)` - Your distribution certificate name
- `com.myapp.ios` - Your app's bundle identifier
- `com.myapp.ios.dev` - Development bundle identifier
- `MyApp dev` - Development provisioning profile name

### Environment-Specific Settings

For different environments (development, staging, production), you'll need to configure:

- Separate provisioning profiles for each environment
- Different bundle identifiers (e.g., `com.myapp.ios.dev`, `com.myapp.ios.staging`, `com.myapp.ios`)
- Environment-specific export options plists
- Separate GitHub environments with their own secrets

### Secret Management

Required secrets in GitHub Actions:

- `IOS_BUILD_CERTIFICATE_BASE64` - Base64-encoded p12 certificate
- `IOS_BUILD_CERTIFICATE_P12_PASSWORD` - Password for the p12 certificate
- `IOS_BUILD_PROVISION_PROFILE_BASE64` - Base64-encoded provisioning profile
- `APP_STORE_CONNECT_API_KEY_ID` - App Store Connect API Key ID
- `APP_STORE_CONNECT_API_KEY_ISSUER_ID` - App Store Connect API Key Issuer ID
- `APP_STORE_CONNECT_API_KEY_CONTENT` - App Store Connect API Key content

Security Best Practices:

- Never commit certificates or provisioning profiles to version control
- Use 1Password or similar secure storage for sensitive files
- Rotate certificates and profiles before they expire
- Use separate certificates for development and production
- Implement proper access controls in GitHub environments

### Example Configuration Structure

```
# 1Password structure
MyApp (Vault)
└── MyApp AppStore Certificate Profiles 2024 (Document)
    ├── MyApp_2024.p12 (Certificate)
    ├── MyApp_dev_2024.mobileprovision (Profile)
    ├── MyApp_production_2024.mobileprovision (Profile)
    └── password (Certificate password)

# GitHub Environments
Flutter iPhone dev
└── Secrets
    ├── IOS_BUILD_CERTIFICATE_BASE64
    ├── IOS_BUILD_CERTIFICATE_P12_PASSWORD
    └── IOS_BUILD_PROVISION_PROFILE_BASE64

Flutter iPhone production
└── Secrets
    ├── IOS_BUILD_CERTIFICATE_BASE64
    ├── IOS_BUILD_CERTIFICATE_P12_PASSWORD
    └── IOS_BUILD_PROVISION_PROFILE_BASE64
```

Note:

### References

- Apple Documentation: Managing Signing Certificates (https://developer.apple.com/documentation/xcode/managing-signing-certificates)
- GitHub Actions: Deploying Xcode Applications (https://docs.github.com/en/actions/deployment/deploying-xcode-applications)
- Flutter: iOS Deployment (https://docs.flutter.dev/deployment/ios)
- Fastlane: Upload to App Store (https://docs.fastlane.tools/actions/upload_to_app_store/)
