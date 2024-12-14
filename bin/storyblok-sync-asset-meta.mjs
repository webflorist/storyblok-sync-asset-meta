#!/usr/bin/env node
/* eslint-disable no-console */
import minimist from 'minimist'
import StoryblokClient from 'storyblok-js-client'
import { performance } from 'perf_hooks'
import dotenvx from '@dotenvx/dotenvx'

const startTime = performance.now()

dotenvx.config({ quiet: true })

const args = minimist(process.argv.slice(2))

if ('help' in args) {
	console.log(`USAGE
  $ npx storyblok-sync-asset-meta
  
OPTIONS
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
  --content-types <types>        Comma seperated list of content/component types to process. Defaults to all.
                                 (e.g. --content-types "page,news-article")
  --skip-stories <stories>       Comma seperated list of the full-slugs of stories to skip.
                                 (e.g. --skip-stories "home,about-us")
  --only-stories <stories>       Comma seperated list of the full-slugs of stories you want to limit processing to.
                                 (e.g. --only-stories "about-us")
  --skip-translations            Does not sync to translations of asset-fields. Defaults to false.
  --overwrite                    Overwrites existing meta data. Defaults to false.
  --publish                      Publish stories after updating. Defaults to false.
                                 WARNING: May publish previously unpublished stories.
  --dry-run                      Only display the changes instead of performing them. Defaults to false.
  --verbose                      Show detailed output for every processed asset.
  --help                         Show this help

MINIMAL EXAMPLE
  $ npx storyblok-sync-asset-meta --token 1234567890abcdef --space 12345

MAXIMAL EXAMPLE
  $ npx storyblok-sync-asset-meta \\
      --token 1234567890abcdef \\
      --region us \\
      --fields "alt,title" \\
      --content-types "page,news-article" \\
      --only-stories "home" \\
      --overwrite \\
      --publish \\
      --dry-run \\
      --verbose
`)
	process.exit(0)
}

if (!('token' in args) && !process.env.STORYBLOK_OAUTH_TOKEN) {
	console.log(
		'Error: State your oauth token via the --token argument or the environment variable STORYBLOK_OAUTH_TOKEN. Use --help to find out more.'
	)
	process.exit(1)
}
const oauthToken = args.token || process.env.STORYBLOK_OAUTH_TOKEN

if (!('space' in args) && !process.env.STORYBLOK_SPACE_ID) {
	console.log(
		'Error: State your space id via the --space argument or the environment variable STORYBLOK_SPACE_ID. Use --help to find out more.'
	)
	process.exit(1)
}
const spaceId = args.space || process.env.STORYBLOK_SPACE_ID

let region = 'eu'
if ('region' in args || process.env.STORYBLOK_REGION) {
	region = args.region || process.env.STORYBLOK_REGION

	if (!['eu', 'us', 'ap', 'ca', 'cn'].includes(region)) {
		console.log('Error: Invalid region parameter stated. Use --help to find out more.')
		process.exit(1)
	}
}

const verbose = 'verbose' in args

const contentTypes = args['content-types'] ? args['content-types'].split(',') : null

const skipStories = args['skip-stories'] ? args['skip-stories'].split(',') : []

const onlyStories = args['only-stories'] ? args['only-stories'].split(',') : []

const fields = args['fields'] ? args['fields'].split(',') : ['alt', 'title', 'copyright', 'source']

// Init Management API
const StoryblokMAPI = new StoryblokClient({
	oauthToken: oauthToken,
	region: region,
})

// General information
console.log('')
console.log(`Performing asset meta-data sync for space ${spaceId}:`)
console.log(`- mode: ${args['dry-run'] ? 'dry-run' : 'live'}`)
console.log(`- publish: ${args.publish ? 'yes' : 'no'}`)
console.log(`- overwrite: ${args.overwrite ? 'yes' : 'no'}`)
console.log(`- fields: ${fields.join(', ')}`)
console.log(`- content types: ${contentTypes ? contentTypes.join(', ') : 'all'}`)
console.log(`- skip-translations: ${args['skip-translations'] ? 'yes' : 'no'}`)
if (skipStories.length > 0) {
	console.log(`- skipped stories: ${skipStories.join(', ')}`)
}
if (onlyStories.length > 0) {
	console.log(`- only stories: ${onlyStories.join(', ')}`)
}

// Fetch all library-assets
console.log('')
console.log(`Fetching library-assets...`)
const libraryAssets = await StoryblokMAPI.getAll(`spaces/${spaceId}/assets`)

// Fetch all stories
console.log('')
console.log(`Fetching stories...`)
const stories = []
const storyList = await StoryblokMAPI.getAll(`spaces/${spaceId}/stories`)
for (const story of storyList) {
	if (
		!story.is_folder &&
		(!contentTypes || contentTypes.includes(story.content_type)) &&
		!skipStories.includes(story.full_slug) &&
		(onlyStories.length > 0 ? onlyStories.includes(story.full_slug) : true)
	) {
		const storyData = await StoryblokMAPI.get(`spaces/${spaceId}/stories/${story.id}`)
		stories.push(storyData.data.story)
	}
}

let storyUpdateRequired = false

const isObject = (item) => typeof item === 'object' && !Array.isArray(item) && item !== null

const isAssetObject = (item) =>
	isObject(item) && 'fieldtype' in item && item.fieldtype === 'asset' && item.filename

const syncAssetObject = (asset, locale) => {
	verboseLog(`  - Asset ${asset.filename}:`)
	const libraryAsset = libraryAssets.find((a) => a.id === asset.id)

	if (!libraryAsset) {
		verboseLog(`    Asset not found in library. Maybe it was deleted?`)
		return asset
	}
	for (const field of fields) {
		verboseLog(`    - Field "${field}":`)
		if (!libraryAsset.meta_data[field]) {
			verboseLog(`      Not set in library. Skipping.`)
			continue
		}
		verboseLog(`      Library value: ${libraryAsset.meta_data[field]}`)
		if (libraryAsset.meta_data[field] == asset.meta_data[field]) {
			verboseLog(`      Instance already has identical value. Skipping.`)
			continue
		} else if (asset.meta_data[field]) {
			verboseLog(`      Instance has different value: "${asset.meta_data[field]}"`)
			if (!args.overwrite) {
				verboseLog(`      Use parameter --overwrite to force sync. Skipping.`)
				continue
			}
		}
		asset[field] = libraryAsset[field]
		asset.meta_data[field] = libraryAsset[field]
		verboseLog(`      Value updated.`)
		storyUpdateRequired = true
	}
	return asset
}

const verboseLog = (...args) => {
	if (verbose) {
		console.log(...args)
	}
}

const parseContentNode = (node) => {
	if (isObject(node)) {
		for (const [key, subNode] of Object.entries(node)) {
			// Skip subnode, if it is a translation.
			if (args['skip-translations'] && key.includes('__i18n__')) {
				continue
			}

			// If subnode is a single asset field...
			if (isAssetObject(subNode)) {
				verboseLog(`- Single asset field "${key}":`)
				node[key] = syncAssetObject(subNode)
			}
			// If subnode is a multi-asset field...
			else if (Array.isArray(subNode) && subNode.length > 0 && isAssetObject(subNode[0])) {
				verboseLog(`- Multi asset field "${key}":`)
				const newSubNode = []
				for (const item of subNode) {
					newSubNode.push(syncAssetObject(item))
				}
			}
			// If subnode is any other array...
			else if (Array.isArray(subNode)) {
				node[key] = subNode.map((item) => parseContentNode(item))
			}
			// If subnode is any other object...
			else {
				node[key] = parseContentNode(subNode)
			}
		}
	}

	return node
}

console.log('')
console.log(`Processing stories...`)
for (const story of stories) {
	storyUpdateRequired = false

	verboseLog('')
	verboseLog(`Slug "${story.full_slug}" / Name "${story.name}"`)

	story.content = parseContentNode(story.content)

	if (!storyUpdateRequired) {
		verboseLog('No update required.')
		continue
	}

	if (args['dry-run']) {
		verboseLog('Dry-run mode. No changes performed.')
		continue
	}

	await StoryblokMAPI.put(`spaces/${spaceId}/stories/${story.id}`, {
		story: story,
		...(args.publish ? { publish: 1 } : {}),
	})

	verboseLog('Story successfully updated.')
}

const endTime = performance.now()

console.log('')
console.log(`Process successfully finished in ${Math.round((endTime - startTime) / 1000)} seconds.`)
process.exit(0)
