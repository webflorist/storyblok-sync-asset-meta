# Sync meta-info of assets from asset library to their instances in Storyblok stories

[![npm version](https://img.shields.io/npm/v/storyblok-sync-asset-meta.svg)](https://www.npmjs.com/package/storyblok-sync-asset-meta)
[![license](https://img.shields.io/github/license/webflorist/storyblok-sync-asset-meta)](https://github.com/webflorist/storyblok-sync-asset-meta/blob/main/LICENSE)

This npx CLI tool automatically syncs meta-information of assets (title, alt-text, copyright and source) from the asset library to all it's instances within stories.

## Use case

When placing an asset inside an _Asset_ or _Multi-Asset_ block in Storyblok, the asset's meta-data (title, alt-text, copyright and source) is only overtaken initially. It is not kept in sync, if this data (e.g. the alt-text of an image) is updated in the asset library.

## Installation

```shell

# simply auto-download and run via npx
$ npx storyblok-sync-asset-meta

# or install globally
$ npm install -g storyblok-sync-asset-meta

# or install for project using npm
$ npm install storyblok-sync-asset-meta

# or install for project using yarn
$ yarn add storyblok-sync-asset-meta

# or install for project using pnpm
$ pnpm add storyblok-sync-asset-meta
```

## Usage

Call `npx storyblok-sync-asset-meta` with the following options:

### Options

```text
--token <token>                (required) Personal OAuth access token created
                               in the account settings of a Stoyblok user.
                               (NOT the Access Token of a Space!)
                               Alternatively, you can set the STORYBLOK_OAUTH_TOKEN environment variable.
--space <space_id>             (required) ID of the space to backup
                               Alternatively, you can set the STORYBLOK_SPACE_ID environment variable.
--region <region>              Region of the space. Possible values are:
                               - 'eu' (default): EU
                               - 'us': US
                               - 'ap': Australia
                               - 'ca': Canada
                               - 'cn': China
                               Alternatively, you can set the STORYBLOK_REGION environment variable.
--fields <fields>              Comma seperated list of meta-data fields to sync.
                               Defaults to all ("alt,title,copyright,source").
                               (e.g. --fields "alt,title")
--skip-stories <stories>       Comma seperated list of the full-slugs of stories to skip.
                               (e.g. --skip-stories "home,about-us")
--only-stories <stories>       Comma seperated list of the full-slugs of stories you want to limit processing to.
                               (e.g. --only-stories "about-us")
--skip-translations            Does not sync to translations of asset-fields. Defaults to false.
--overwrite                    Overwrites existing meta data. Defaults to false.
--publish                      Publish stories after updating. Defaults to false.
--dry-run                      Only display the changes instead of performing them. Defaults to false.
--verbose                      Show detailed output for every processed asset.
--help                         Show this help
```

Storyblok OAuth token, space-id and region can be set via environment variables. You can also use a `.env` file in your project root for this (see `.env.example`).

### Minimal example

```shell
npx storyblok-sync-asset-meta --token 1234567890abcdef --space 12345
```

### Maximal example

```shell
npx storyblok-sync-asset-meta \
    --token 1234567890abcdef \
    --region us \
    --fields "alt,title" \
    --only-stories "home" \
    --overwrite \
    --publish \
    --dry-run \
    --verbose
```

## License

This package is open-sourced software licensed under the [MIT license](https://github.com/webflorist/storyblok-sync-asset-meta/blob/main/LICENSE).
