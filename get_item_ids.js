const http_request = require("request-promise-native");
const fs = require("fs");

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function saveProgress(data) {
    try {
        fs.writeFileSync("data/item_ids.json", JSON.stringify(data, Object.keys(data).sort(), 2));
    } catch (_err) {
        console.error("Failed to save progress.");
    }
}

function getItemID(item_name) {
    return new Promise((resolve, reject) => {
        http_request("https://steamcommunity.com/market/listings/730/" + encodeURI(item_name))
            .then((s) => {
                let match = /Market_LoadOrderSpread\(\s*(\d+)\s*\)/.exec(s);
                if (match != null) {
                    resolve(match[1]);
                } else {
                    console.error("Item " + item_name + " not found!");
                    reject();
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
}

async function fetchAllIDs() {
    let hash_names;
    try {
        hash_names = fs
            .readFileSync("data/hash_names.txt", { encoding: "UTF-8" })
            .split(/\r?\n/)
            .filter((x) => x.length > 0);
    } catch (_err) {
        console.error("Unable to read data/hash_names.txt");
        process.exit(1);
    }

    let item_ids;
    try {
        item_ids = JSON.parse(fs.readFileSync("data/item_ids.json", { encoding: "UTF-8" }));
    } catch {
        item_ids = {};
    }

    let missing_items = hash_names.filter((x) => !(x in item_ids));

    console.log(`Fetching ${missing_items.length} ids.`);

    for (let i = 0; i < missing_items.length; i++) {
        const item = missing_items[i];
        let timeout = 3100;
        try {
            const id = await getItemID(item);
            item_ids[item] = id;
            saveProgress(item_ids);
            console.log("Loaded", item, id);
        } catch (err) {
            if (!err) {
                console.log("Skipping", item);
            } else {
                // retry after 5min
                console.log("Error while loading", item);
                timeout = 5 * 60 * 1000;
                i--;
            }
        }
        await sleep(timeout);
    }
}

fetchAllIDs();
