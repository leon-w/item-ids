import { readFileSync, writeFileSync } from "fs";

const sleep = time => new Promise(resolve => setTimeout(resolve, time));

async function fetchHashNames(appId) {
    const allNames = [];
    let page = 0;

    while (true) {
        try {
            const args = `start=${100 * page}&count=100&sort_column=name&sort_dir=asc&appid=${appId}&norender=1`;
            const response = await fetch(`https://steamcommunity.com/market/search/render?${args}`);
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            const pageData = await response.json();

            allNames.push(...pageData.results.map(x => x.hash_name));

            const totalCount = pageData.total_count || Infinity;
            if (pageData.start + pageData.pagesize >= totalCount) {
                console.log("Loaded all names.");
                break;
            }

            if (page === 0) {
                const totalPages = Math.ceil(totalCount / 100);
                console.log(`Loading names for app id ${appId}... (${totalCount} items, ~${totalPages} pages)`);
            }

            console.log(`Loaded page ${page}.`);
            page++;

            await sleep(3000);
        } catch (err) {
            console.log(`Failed to load page ${page}: ${err.toString()}. Retrying after 3min...`);
            await sleep(3 * 60 * 1000);
        }
    }

    return [...new Set(allNames)].sort();
}

async function fetchIds(appId) {
    const outputFile = `data/${appId}.json`;
    const hashNames = await fetchHashNames(appId);

    let itemIds;
    try {
        itemIds = JSON.parse(readFileSync(outputFile, { encoding: "UTF-8" }));
    } catch {
        itemIds = {};
    }

    const missingItems = hashNames.filter(x => !(x in itemIds));
    const missingCount = missingItems.length;
    let newIds = 0;

    console.log(`Fetching ${missingItems.length} new ids...`);

    for (let i = 0; i < missingCount; i++) {
        const hashName = missingItems[i];
        try {
            const response = await fetch(
                `https://steamcommunity.com/market/listings/${appId}/${encodeURIComponent(hashName)}`
            );
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            const html = await response.text();

            const match = /Market_LoadOrderSpread\(\s*(\d+)\s*\)/.exec(html);
            if (match === null) {
                console.error(`!!! No id found for ${hashName} !!!`);
                continue;
            }

            const id = match[1].trim();
            itemIds[hashName] = id;
            newIds++;

            try {
                writeFileSync(outputFile, JSON.stringify(itemIds, Object.keys(itemIds).sort(), 4));
            } catch (err) {
                console.error(`Failed to save progress: ${err.toString()}.`);
            }

            console.log(`(${i + 1}/${missingCount}) Loaded ${hashName}: ${id}`);

            await sleep(3100);
        } catch (err) {
            i--;
            console.log(`Failed to load id for "${hashName}": ${err.toString()}.`);
            await sleep(5 * 60 * 1000);
        }
    }
    console.log(`Saved ${newIds} new ids to ${outputFile}.`);
}

async function main() {
    const appIds = {
        cs2: 730,
        rust: 252490,
    };

    let appIdArg = process.argv[2];

    if (isNaN(appIdArg)) {
        if (appIdArg in appIds) {
            appIdArg = appIds[appIdArg];
        } else {
            console.error(`Invalid appId '${appIdArg}'`);
            process.exit(1);
        }
    }

    await fetchIds(appIdArg);
}

await main();
