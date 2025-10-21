import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Key used to map package_name to uid
const APP_LIST_KEY = 'app_list';
const KV_BINDING_NAME = 'fluxia_database';

// Helper to get the KV instance using the platform environment binding
const getKV = (platform: App.Platform | undefined) => {
	return platform?.env ? platform.env[KV_BINDING_NAME] : undefined;
};

/**
 * GET: /api/v1/check?id={package_name}
 * Used by external applications (like Android apps) to check for updates.
 * Returns only the version, build_no, and link for the requested package ID.
 */
export const GET: RequestHandler = async ({ platform, url }) => {
	const FLUXIA_DB = getKV(platform);
	if (!FLUXIA_DB) {
		return json(
			{ status: 'error', message: `KV binding '${KV_BINDING_NAME}' is missing.` },
			{ status: 500 }
		);
	}

	const packageName = url.searchParams.get('id');

	if (!packageName) {
		return json(
			{ status: 'error', message: 'Missing required query parameter: id (package_name).' },
			{ status: 400 }
		);
	}

	try {
		// 1. Get the package_name to UID map from KV
		const appListRaw = await FLUXIA_DB.get(APP_LIST_KEY);
		const appList: Record<string, string> = appListRaw ? JSON.parse(appListRaw) : {};

		const uid = appList[packageName];

		if (!uid) {
			return json(
				{ status: 'error', message: `App package '${packageName}' not found in Fluxia manager.` },
				{ status: 404 }
			);
		}

		// 2. Use the UID to fetch the app's full data
		const appDataRaw = await FLUXIA_DB.get(uid);

		if (!appDataRaw) {
			// This case indicates an inconsistency in the database
			return json(
				{ status: 'error', message: `Data for UID '${uid}' is missing.` },
				{ status: 404 }
			);
		}

		const appData = JSON.parse(appDataRaw);

		// 3. Return a minimal payload with only update-relevant fields
		return json({ status: 'success', data: appData });
	} catch (e) {
		// Log detailed error internally but return a generic 500
		console.error('API Error during update check:', e);
		return json(
			{ status: 'error', message: 'Internal server error during update check.' },
			{ status: 500 }
		);
	}
};
