const fs = require("fs");

const { ArgumentParser } = require("argparse");
const superagent = require("superagent");

const appIdAliases = require("./appIdAliases.json");

const sleep = time => new Promise(resolve => setTimeout(resolve, time));

async function fetchHashNames(appId) {
    const allNames = [];
    let page = 0;

    while (true) {
        try {
            const pageData = (
                await superagent.get("https://steamcommunity.com/market/search/render", {
                    start: 100 * page,
                    count: 100,
                    sort_column: "name",
                    sort_dir: "asc",
                    appid: appId,
                    norender: 1,
                })
            ).body;

            allNames.push(...pageData.results.map(x => x.hash_name));
            if (pageData.start + pageData.pagesize >= pageData.total_count) {
                console.log("Loaded all names.")
                break;
            }

            if (page == 0) {
                const totalPages = Math.ceil(pageData.total_count / 100);
                console.log(`Loading names for app id ${appId}. ${pageData.total_count} items, ~${totalPages} pages`);
            }

            console.log(`Loaded page ${page}.`);
            page++;
            
            await sleep(3000);
        } catch (err) {
            console.log(`Failed to load page ${page}: ${err.toString()}. Retrying after 3min...`);
            await sleep(3 * 60 * 1000);
        }
    }

    const namesFiltered = [...new Set(allNames)].sort();

    return namesFiltered;
}

async function fetchIds(appId) {
    const file = `data/${appId}.json`;
    const hashNames = await fetchHashNames(appId);

    let itemIds;
    try {
        itemIds = JSON.parse(fs.readFileSync(file, { encoding: "UTF-8" }));
    } catch {
        itemIds = {};
    }

    const missingItems = hashNames.filter(x => !(x in itemIds));
    const missingCount = missingItems.length;

    console.log(`Fetching ${missingItems.length} new ids.`);

    for (let i = 0; i < missingCount; i++) {
        const hashName = missingItems[i];
        let timeout = 3100;
        try {
            const html = (
                await superagent.get(
                    `https://steamcommunity.com/market/listings/${appId}/${encodeURIComponent(hashName)}`
                )
            ).text;
            console.log();
            const match = /Market_LoadOrderSpread\(\s*(\d+)\s*\)/.exec(html);
            if (match == null) {
                console.error(`No id found for ${hashName}.`);
                continue;
            }
            const id = match[1].trim();
            itemIds[hashName] = id;
            try {
                fs.writeFileSync(file, JSON.stringify(itemIds, Object.keys(itemIds).sort(), 4));
            } catch (err) {
                console.error(`Failed to save progress: ${err.toString()}.`);
            }
            console.log(`(${i + 1}/${missingCount}) Loaded ${hashName}: ${id}`);
        } catch (err) {
            console.log(`Failed to load id for "${hashName}": ${err.toString()}.`);
            timeout = 5 * 60 * 1000;
            i--;
        }
        await sleep(timeout);
    }
    console.log(`Saved ${missingItems.length} new ids to ${file}.`);
}

(async () => {
    const parser = new ArgumentParser();

    parser.add_argument("appId", { help: "App ID of the game or alias", type: String });

    const args = parser.parse_args();

    if (isNaN(args.appId)) {
        if (args.appId in appIdAliases) {
            args.appId = appIdAliases[args.appId];
        } else {
            console.error(`Unknown appId alias "${args.appId}" (available: ${Object.keys(appIdAliases).join("|")})`);
            return;
        }
    }

    await fetchIds(args.appId);
})();
