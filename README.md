
# Localize-Action

**Automate your app’s localization with seamless i18n translations using the Localize-Action GitHub Action.**

## 🚀 Features

- **Automatic Translation:** Automatically translate your i18n files whenever you push updates to your repository.
- **Seamless Integration:** Easily integrate with your existing CI/CD pipeline, reducing manual effort and saving time.
- **Comprehensive Language Support:** Support for over 50 languages, ensuring your application is accessible to a global audience.
- **Real-Time Collaboration:** Collaborate with your team to manage translations and maintain consistency across all languages.

## 📦 Installation

To use the Localize-Action in your workflow, simply add it to your GitHub Actions workflow file.

```yaml
name: Localize i18n Files

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Run Localize-Action
        uses: your-username/localize-action@v1
        with:
          api-key: ${{ secrets.LOCALIZE_API_KEY }}
          i18n-directory: 'src/locales'
```

## 🔧 Configuration

- **`api-key` (required):** Your API key for the translation service.
- **`i18n-directory` (required):** The directory where your i18n files are stored.
- **`default-language` (optional):** The default language for your translations (e.g., `en` for English).
- **`target-languages` (optional):** A comma-separated list of target languages (e.g., `fr,es,de`).

## 🎯 Example Workflow

Here’s an example workflow that uses the Localize-Action to automatically translate your i18n files whenever you push to the `main` branch:

```yaml
name: Localize i18n Files

on:
  push:
    branches:
      - main

jobs:
  translate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Run Localize-Action
        uses: your-username/localize-action@v1
        with:
          api-key: ${{ secrets.LOCALIZE_API_KEY }}
          i18n-directory: 'src/locales'
          default-language: 'en'
          target-languages: 'fr,es,de'
```

## 🛠️ Customization

You can customize the action to fit your workflow needs. Adjust the input parameters as needed to support your project’s localization strategy.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Feedback and Support

If you have any questions, issues, or feedback, please open an issue in this repository, or contact us directly at [support@getlocalized.io](mailto:support@getlocalized.io).

---

**Happy localizing!**
