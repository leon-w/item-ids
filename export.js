const fs = require("fs");
const path = require("path");

function exportIds() {
    const ids = {};

    let totalIds = 0;
    let apps = 0;

    for (const file of fs.readdirSync("data")) {
        const appId = path.basename(file, ".json");
        try {
            ids[appId] = JSON.parse(fs.readFileSync(path.join("data", file)));
            totalIds += Object.keys(ids[appId]).length;
            apps++;
        } catch (e) {
            console.error(e.toString());
        }
    }

    const exportString = JSON.stringify(ids);
    fs.writeFileSync("dist/all_ids.json", exportString);
    console.log(`Exported ${totalIds} ids from ${apps} apps.`);
}

exportIds();
