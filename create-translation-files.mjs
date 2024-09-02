import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// Environment Variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const I18N_DIRECTORY = process.env.I18N_DIRECTORY;
const DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE;
const TARGET_LANGUAGES = process.env.TARGET_LANGUAGES;
const REPO_NAME = process.env.REPO_NAME;
const BASE_BRANCH = process.env.BASE_BRANCH || "main";
const TRANSLATE_API_URL = "https://api.getlocalized.io/translate";
const REPO_OWNER = process.env.REPO_OWNER || "GetLocalized"; // Default to 'GetLocalized', make it configurable

// Initialize Octokit
const octokit = new Octokit({
    auth: GITHUB_TOKEN,
    request: {
        fetch,
    },
});

const branchName = `translate-${TARGET_LANGUAGES}-${Date.now()}`;
console.log({ BASE_BRANCH });

/**
 * Translate files to target languages.
 */
async function translateFiles() {
    const inputLangCode = DEFAULT_LANGUAGE;
    const outputLangCodes = TARGET_LANGUAGES.split(",");

    const filePath = path.join(
        process.cwd(),
        I18N_DIRECTORY,
        `${inputLangCode}.json`,
    );
    const translationContent = fs.readFileSync(filePath, "utf8");

    const translationPromises = outputLangCodes.map(async (outputLangCode) => {
        const translatedData = await translateContent(
            inputLangCode,
            outputLangCode,
            translationContent,
        );
        saveTranslation(outputLangCode, translatedData);
    });

    await Promise.all(translationPromises);
}

/**
 * Translate content using an external API.
 */
async function translateContent(
    inputLangCode,
    outputLangCode,
    translationContent,
) {
    const requestBody = {
        inputLangCode,
        outputLangCode,
        translationContent,
    };

    try {
        const response = await fetch(TRANSLATE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(
                `Failed to translate content for ${outputLangCode}: ${response.statusText}`,
            );
        }

        const responseJSON = await response.json();
        return JSON.parse(responseJSON.translatedContent);
    } catch (error) {
        console.error(`Error translating content to ${outputLangCode}:`, error);
        throw error;
    }
}

/**
 * Save translated content to a file.
 */
function saveTranslation(outputLangCode, translatedData) {
    const outputFilePath = path.join(
        process.cwd(),
        I18N_DIRECTORY,
        `${outputLangCode}.json`,
    );
    fs.writeFileSync(
        outputFilePath,
        JSON.stringify(translatedData, null, 2),
        "utf8",
    );
    console.log(`Translation completed and saved to ${outputFilePath}`);
}

/**
 * Create a new branch in the repository.
 */
async function createBranch() {
    try {
        const { data: latestCommit } = await octokit.repos.getBranch({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            branch: BASE_BRANCH,
        });

        await octokit.git.createRef({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            ref: `refs/heads/${branchName}`,
            sha: latestCommit.commit.sha,
        });

        console.log(`Created new branch ${branchName}`);
    } catch (error) {
        console.error(`Error creating branch ${branchName}:`, error);
        throw error;
    }
}

/**
 * Commit the translated files to the new branch.
 */
async function commitChanges() {
    const outputLangCodes = TARGET_LANGUAGES.split(",");

    for (const outputLangCode of outputLangCodes) {
        await commitFile(outputLangCode);
    }
}

/**
 * Commit a single file to the branch.
 */
async function commitFile(outputLangCode) {
    const filePath = path.join(I18N_DIRECTORY, `${outputLangCode}.json`);
    const content = fs.readFileSync(filePath, "utf8");
    const contentBase64 = Buffer.from(content).toString("base64");

    try {
        const { data: latestCommit } = await octokit.repos.getBranch({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            branch: branchName,
        });

        const { data: blob } = await octokit.git.createBlob({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            content: contentBase64,
            encoding: "base64",
        });

        const { data: newTree } = await octokit.git.createTree({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            base_tree: latestCommit.commit.commit.tree.sha,
            tree: [
                {
                    path: filePath,
                    mode: "100644",
                    type: "blob",
                    sha: blob.sha,
                },
            ],
        });

        const { data: newCommit } = await octokit.git.createCommit({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            message: `Add ${outputLangCode} translations`,
            tree: newTree.sha,
            parents: [latestCommit.commit.sha],
        });

        await octokit.git.updateRef({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            ref: `heads/${branchName}`,
            sha: newCommit.sha,
        });

        console.log(
            `Committed ${outputLangCode} translation to branch ${branchName}`,
        );
    } catch (error) {
        console.error(`Error committing ${outputLangCode} translation:`, error);
        throw error;
    }
}

/**
 * Create a pull request for the translated files.
 */
async function createPullRequest() {
    try {
        const { data: pullRequest } = await octokit.pulls.create({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            title: `Add \`${TARGET_LANGUAGES}\` translations`,
            head: branchName,
            base: BASE_BRANCH,
            body: `This PR adds \`${TARGET_LANGUAGES}\` translations for the i18n files.`,
        });

        console.log(`Pull request created: ${pullRequest.html_url}`);
        return pullRequest.html_url;
    } catch (error) {
        console.error("Error creating pull request:", error);
        throw error;
    }
}

/**
 * Comment on the current pull request.
 */
async function commentOnCurrentPullRequest(newPullRequestUrl) {
    const currentPullRequestNumber =
        process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER;

    if (!currentPullRequestNumber) {
        console.log("No current pull request number found.");
        return;
    }

    try {
        await octokit.issues.createComment({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            issue_number: currentPullRequestNumber,
            body: `A new pull request has been created with the translations: ${newPullRequestUrl}`,
        });

        console.log(`Commented on current PR #${currentPullRequestNumber}`);
    } catch (error) {
        console.error(
            `Error commenting on PR #${currentPullRequestNumber}:`,
            error,
        );
    }
}

// Execute the workflow
(async () => {
    try {
        await translateFiles();
        await createBranch();
        await commitChanges();
        const newPullRequestUrl = await createPullRequest();
        await commentOnCurrentPullRequest(newPullRequestUrl);
    } catch (error) {
        console.error("Error executing workflow:", error);
    }
})();
