<script>
    import { onMount } from 'svelte';
    import { fade, slide } from 'svelte/transition';

    const initialNewApp = {
        name: '',
        version: '1.0.0',
        build_no: 1,
        package_name: '',
        uid: crypto.randomUUID().substring(0, 8),
        link: ''
    };

    let apps = $state([]);
    let newApp = $state({ ...initialNewApp });
    let editingApp = $state(null);
    let isLoading = $state(true);
    let error = $state(null);
    let isModalOpen = $state(false);
    let isNew = $state(true);

    const fetchApps = async () => {
        isLoading = true;
        error = null;
        try {
            const response = await fetch('/api/v1/manager');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            apps = data.apps || [];
        } catch (e) {
            error = 'Failed to load app data. Check backend API.';
            console.error(e);
        } finally {
            isLoading = false;
        }
    };

    const openModal = (app = null) => {
        isNew = app === null;
        editingApp = app ? JSON.parse(JSON.stringify(app)) : { ...initialNewApp, uid: crypto.randomUUID().substring(0, 8) };
        isModalOpen = true;
    };

    const closeModal = () => {
        isModalOpen = false;
        editingApp = null;
    };

    const saveApp = async () => {
        isLoading = true;
        error = null;
        try {
            const method = isNew ? 'POST' : 'PUT';
            const response = await fetch('/api/v1/manager', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingApp)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            closeModal();
            await fetchApps();
        } catch (e) {
            error = `Failed to save app: ${e.message}`;
            console.error(e);
        } finally {
            isLoading = false;
        }
    };

    const deleteApp = async (uid) => {
        if (!confirm('Are you sure you want to delete this app?')) return;

        isLoading = true;
        error = null;
        try {
            const response = await fetch(`/api/v1/manager?uid=${uid}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            await fetchApps();
        } catch (e) {
            error = `Failed to delete app: ${e.message}`;
            console.error(e);
        } finally {
            isLoading = false;
        }
    };

    onMount(() => {
        fetchApps();
    });
</script>

<div class="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
    <div class="max-w-7xl mx-auto">
        <header class="pb-6 border-b border-gray-200 mb-8 flex justify-between items-center">
            <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Fluxia App Manager</h1>
            <button
                    onclick={() => openModal()}
                    class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 transform hover:scale-[1.02] active:scale-95 flex items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                Add New App
            </button>
        </header>

        {#if error}
            <div in:fade class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                <strong class="font-bold">Error!</strong>
                <span class="block sm:inline ml-2">{error}</span>
            </div>
        {/if}

        {#if isLoading}
            <div class="text-center py-10 text-gray-500 flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading App List...
            </div>
        {:else if apps.length === 0}
            <div class="text-center py-20 text-gray-500 border border-dashed border-gray-300 rounded-xl">
                <p class="text-xl font-medium mb-2">No Apps Found</p>
                <p>Click "Add New App" to start managing updates.</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each apps as app (app.uid)}
                    <div in:fade class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transition duration-150 hover:shadow-xl">
                        <h2 class="text-xl font-bold text-gray-800 mb-1 truncate">{app.name}</h2>
                        <p class="text-sm text-indigo-600 font-mono mb-4">{app.package_name}</p>

                        <div class="space-y-2 text-sm text-gray-600">
                            <p class="flex justify-between">
                                <span class="font-medium">Version:</span>
                                <span>{app.version} ({app.build_no})</span>
                            </p>
                            <p class="flex justify-between">
                                <span class="font-medium">UID:</span>
                                <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{app.uid}</span>
                            </p>
                            <p class="flex justify-between items-start">
                                <span class="font-medium">Link:</span>
                                <a href={app.link} target="_blank" class="text-blue-500 hover:text-blue-700 text-right max-w-[50%] truncate">{app.link}</a>
                            </p>
                        </div>

                        <div class="mt-4 flex space-x-3 pt-4 border-t border-gray-100">
                            <button
                                    onclick={() => openModal(app)}
                                    class="flex-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                                Edit
                            </button>
                            <button
                                    onclick={() => deleteApp(app.uid)}
                                    class="flex-1 px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

{#if isModalOpen}
    <div transition:fade class="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div transition:slide class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div class="p-6 border-b border-gray-100">
                <h3 class="text-2xl font-bold text-gray-900">{isNew ? 'Add New App' : 'Edit App'}</h3>
                <p class="text-sm text-gray-500">UID: <span class="font-mono text-indigo-600">{editingApp.uid}</span></p>
            </div>

            <form onsubmit={saveApp} class="p-6 space-y-4">

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="name" class="block text-sm font-medium text-gray-700">App Name</label>
                        <input id="name" type="text" bind:value={editingApp.name} required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"/>
                    </div>
                    <div>
                        <label for="package_name" class="block text-sm font-medium text-gray-700">Package Name (ID)</label>
                        <input id="package_name" type="text" bind:value={editingApp.package_name} required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"/>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label for="version" class="block text-sm font-medium text-gray-700">Version</label>
                        <input id="version" type="text" bind:value={editingApp.version} required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"/>
                    </div>
                    <div>
                        <label for="build_no" class="block text-sm font-medium text-gray-700">Build Number</label>
                        <input id="build_no" type="number" bind:value={editingApp.build_no} required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"/>
                    </div>
                    <div>
                        <label for="uid" class="block text-sm font-medium text-gray-700">Unique ID (UID)</label>
                        <input id="uid" type="text" bind:value={editingApp.uid} required disabled={!isNew} class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border disabled:bg-gray-100 disabled:text-gray-500"/>
                    </div>
                </div>

                <div>
                    <label for="link" class="block text-sm font-medium text-gray-700">Download Link (URL)</label>
                    <input id="link" type="url" bind:value={editingApp.link} required class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"/>
                </div>

                <div class="pt-4 flex justify-end space-x-3">
                    <button type="button" onclick={closeModal} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button type="submit" disabled={isLoading} class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition disabled:opacity-50">
                        {isLoading ? 'Saving...' : (isNew ? 'Create App' : 'Save Changes')}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
