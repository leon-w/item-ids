const http_request = require("request-promise-native");
const fs = require("fs");

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function getPage(page) {
    return new Promise((resolve, reject) => {
        http_request({
            url: "https://steamcommunity.com/market/search/render",
            method: "GET",
            qs: {
                start: 100 * page,
                count: 100,
                sort_column: "name",
                sort_dir: "asc",
                appid: 730,
                norender: 1,
            },
        })
            .then((data) => {
                resolve(JSON.parse(data).results.map((item) => item.hash_name));
            })
            .catch((err) => reject(err));
    });
}

let page_idx = 0;
let allNames = [];

async function fetchAllHashNames() {
    while (true) {
        try {
            const names = await getPage(page_idx);
            allNames.push(...names);
            console.log("Loaded page", page_idx);
            if (names.length != 100) break;
            page_idx++;
            await sleep(3000);
        } catch (err) {
            console.log(`Faild to load page ${page_idx}. Retrying after 3min...`);
            await sleep(3 * 60 * 1000);
        }
    }
    try {
        fs.mkdirSync("data");
    } catch (err) {}
    fs.writeFile("data/hash_names.txt", allNames.join("\n"), (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Saved names to  data/hash_names.txt");
        }
    });
}

fetchAllHashNames();
