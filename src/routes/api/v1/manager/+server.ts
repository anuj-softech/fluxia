import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// The key used to store the mapping of package_name to uid
const APP_LIST_KEY = 'app_list';
const KV_BINDING_NAME = 'fluxia_database';

// Helper function to get the KV instance
const getKV = (platform: App.Platform | undefined) => {
	return platform?.env ? platform.env[KV_BINDING_NAME] : undefined;
};

// GET: Fetch all apps
export const GET: RequestHandler = async ({ platform }) => {
	const FLUXIA_DB = getKV(platform);
	if (!FLUXIA_DB) {
		return json({ status: 'error', message: `KV binding '${KV_BINDING_NAME}' is missing.` }, { status: 500 });
	}

	let appList: Record<string, string>; // Maps package_name to uid

	try {
		const appListRaw = await FLUXIA_DB.get(APP_LIST_KEY);
		appList = appListRaw ? JSON.parse(appListRaw) : {};
	} catch (e) {
		return json({ status: 'error', message: 'Failed to read app list map.', detail: e.message }, { status: 500 });
	}

	const appUids = Object.values(appList);
	const appDataPromises = appUids.map(uid => FLUXIA_DB.get(uid));
	const appDataRawResults = await Promise.all(appDataPromises);

	const apps = appDataRawResults.map(raw => {
		try {
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}).filter(app => app !== null);

	return json({ status: 'success', apps });
};

// POST: Create a new app entry
export const POST: RequestHandler = async ({ request, platform }) => {
	const FLUXIA_DB = getKV(platform);
	if (!FLUXIA_DB) {
		return json({ status: 'error', message: `KV binding '${KV_BINDING_NAME}' is missing.` }, { status: 500 });
	}

	const appData = await request.json();

	if (!appData.package_name || !appData.uid) {
		return json({ status: 'error', message: 'Missing package_name or uid.' }, { status: 400 });
	}

	let appList: Record<string, string>;
	try {
		const appListRaw = await FLUXIA_DB.get(APP_LIST_KEY);
		appList = appListRaw ? JSON.parse(appListRaw) : {};
	} catch (e) {
		return json({ status: 'error', message: 'Failed to read app list map during POST.', detail: e.message }, { status: 500 });
	}

	// Check for package name collision
	if (appList[appData.package_name]) {
		return json({ status: 'error', message: `An app with package '${appData.package_name}' already exists.` }, { status: 409 });
	}

	try {
		// Update both the uid key and the package map key
		const uid = appData.uid;
		appList[appData.package_name] = uid;

		const promises = [
			FLUXIA_DB.put(APP_LIST_KEY, JSON.stringify(appList)),
			FLUXIA_DB.put(uid, JSON.stringify(appData))
		];

		await Promise.all(promises);

		return json({ status: 'success', message: 'App created successfully.', uid });
	} catch (e) {
		return json({ status: 'error', message: 'Failed to save app data.', detail: e.message }, { status: 500 });
	}
};

// PUT: Update an existing app entry
export const PUT: RequestHandler = async ({ request, platform }) => {
	const FLUXIA_DB = getKV(platform);
	if (!FLUXIA_DB) {
		return json({ status: 'error', message: `KV binding '${KV_BINDING_NAME}' is missing.` }, { status: 500 });
	}

	const appData = await request.json();

	if (!appData.uid) {
		return json({ status: 'error', message: 'Missing uid for update.' }, { status: 400 });
	}

	try {
		// We only update the UID key, as the package map is already correct from POST
		await FLUXIA_DB.put(appData.uid, JSON.stringify(appData));
		return json({ status: 'success', message: 'App updated successfully.', uid: appData.uid });
	} catch (e) {
		return json({ status: 'error', message: 'Failed to update app data.', detail: e.message }, { status: 500 });
	}
};

// DELETE: Delete an app entry
export const DELETE: RequestHandler = async ({ platform, url }) => {
	const FLUXIA_DB = getKV(platform);
	if (!FLUXIA_DB) {
		return json({ status: 'error', message: `KV binding '${KV_BINDING_NAME}' is missing.` }, { status: 500 });
	}

	const uid = url.searchParams.get('uid');

	if (!uid) {
		return json({ status: 'error', message: 'Missing UID for deletion.' }, { status: 400 });
	}

	let appList: Record<string, string>;
	let packageToDelete: string | null = null;

	try {
		const appListRaw = await FLUXIA_DB.get(APP_LIST_KEY);
		appList = appListRaw ? JSON.parse(appListRaw) : {};
	} catch (e) {
		return json({ status: 'error', message: 'Failed to read app list map during DELETE.', detail: e.message }, { status: 500 });
	}

	// Find the package name associated with the UID to remove it from the map
	for (const [pkg, u] of Object.entries(appList)) {
		if (u === uid) {
			packageToDelete = pkg;
			break;
		}
	}

	if (!packageToDelete) {
		return json({ status: 'error', message: 'App UID not found in the package map.' }, { status: 404 });
	}

	try {
		// Delete from map and delete the app data itself
		delete appList[packageToDelete];

		const promises = [
			FLUXIA_DB.put(APP_LIST_KEY, JSON.stringify(appList)),
			FLUXIA_DB.delete(uid)
		];

		await Promise.all(promises);

		return json({ status: 'success', message: `App '${packageToDelete}' (UID: ${uid}) deleted successfully.` });
	} catch (e) {
		return json({ status: 'error', message: 'Failed to delete app data.', detail: e.message }, { status: 500 });
	}
};
