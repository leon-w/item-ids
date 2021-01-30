const fs = require("fs");

const { ArgumentParser } = require("argparse");
const superagent = require("superagent");

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
                break;
            }

            if (page == 0) {
                const totalPages = Math.ceil(pageData.total_count / 100);
                console.log(`Loading names for app id ${appId}. ${pageData.total_count} items, ~${totalPages} pages`);
            }

            console.log("Loaded page", page);
            page++;
            await sleep(3000);
        } catch (err) {
            console.log(`${err.toString()} | Failed to load page ${page}. Retrying after 3min...`);
            await sleep(3 * 60 * 1000);
        }
    }

    const dir = `data/${appId}`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    const namesFiltered = [...new Set(allNames)].sort();
    fs.writeFileSync(`${dir}/names.json`, JSON.stringify(namesFiltered, null, 4));
    console.log(`Saved ${namesFiltered.length} names to ${dir}/names.json`);
}

async function fetchIds(appId) {
    const dir = `data/${appId}`;
    let hashNames;
    try {
        hashNames = JSON.parse(fs.readFileSync(`${dir}/names.json`, { encoding: "UTF-8" }));
    } catch {
        console.error(`Error: ${dir}/names.json not found. Make sure to load names first.`);
        process.exit(1);
    }

    let itemIds;
    try {
        itemIds = JSON.parse(fs.readFileSync(`${dir}/ids.json`, { encoding: "UTF-8" }));
    } catch {
        itemIds = {};
    }

    const missingItems = hashNames.filter(x => !(x in itemIds));
    const missingCount = missingItems.length;

    console.log(`Fetching ${missingItems.length} ids.`);

    for (let i = 0; i < missingCount; i++) {
        const hashName = missingItems[i];
        let timeout = 3100;
        try {
            const html = (
                await superagent.get(`https://steamcommunity.com/market/listings/${appId}/${encodeURIComponent(hashName)}`)
            ).text;
            console.log()
            const id = /Market_LoadOrderSpread\(\s*(\d+)\s*\)/.exec(html)[1];
            itemIds[hashName] = id;
            try {
                fs.writeFileSync(`${dir}/ids.json`, JSON.stringify(itemIds, Object.keys(itemIds).sort(), 4));
            } catch (err) {
                console.error(`${err.toString()} | Failed to save progress.`);
            }
            console.log(`(${i + 1}/${missingCount}) Loaded ${hashName}: ${id}`);
        } catch (err) {
            console.log(`${err.toString()} | Failed to load id for ${hashName}`);
            timeout = 5 * 60 * 1000;
            i--;
        }
        await sleep(timeout);
    }
    console.log(`Saved ${missingItems.length} new ids to ${dir}/ids.json`);
}

(async () => {
    const parser = new ArgumentParser();

    parser.add_argument("appId", { help: "App ID of the game", type: Number });
    parser.add_argument("mode", { help: "What data should be loaded", choices: ["both", "names", "ids"] });

    const args = parser.parse_args();
    switch (args.mode) {
        case "both":
            await fetchHashNames(args.appId);
            await fetchIds(args.appId);
            break;
        case "names":
            await fetchHashNames(args.appId);
            break;
        case "ids":
            await fetchIds(args.appId);
            break;
    }
})();
