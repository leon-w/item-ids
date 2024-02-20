import { readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";

function exportIds() {
    const ids = {};

    let totalIds = 0;
    let apps = 0;

    for (const file of readdirSync("data")) {
        const appId = basename(file, ".json");
        try {
            ids[appId] = JSON.parse(readFileSync(join("data", file)));
            totalIds += Object.keys(ids[appId]).length;
            apps++;
        } catch (e) {
            console.error(e.toString());
        }
    }

    writeFileSync("dist/all_ids.json", JSON.stringify(ids));
    console.log(`Exported ${totalIds} ids from ${apps} apps.`);
}

exportIds();
