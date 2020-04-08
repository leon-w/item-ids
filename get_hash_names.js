const http_request = require("request-promise-native");

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
async function fetchAllHashNames() {
    while (true) {
        const names = await getPage(page_idx);
        names.forEach(name => console.log(name));
        if (names.length != 100) break;
        page_idx++;
        await sleep(1000);
    }
}

fetchAllHashNames();
