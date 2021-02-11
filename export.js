const fs = require("fs");
const path = require("path");
const { ArgumentParser } = require("argparse");

function exportIds(args) {
    const appIds = fs.readdirSync("data");
    const ids = {};

    let totalIds = 0;
    let apps = 0;

    for (const appId of appIds) {
        try {
            ids[appId] = JSON.parse(fs.readFileSync(path.join("data", appId, "ids.json")));
            totalIds += Object.keys(ids[appId]).length;
            apps++;
        } catch (e) {
            console.error(e.toString());
        }
    }

    let exportString = args.minify ? JSON.stringify(ids) : JSON.stringify(ids, null, 4);

    if (args.mode == "js") {
        exportString = `const STEAM_BUYORDER_IDS = ${exportString};`;
    }

    const file = args.output.includes(".") ? args.output : `${args.output}.${args.mode}`;
    fs.writeFileSync(file, exportString);
    console.log(`Saved ${totalIds} ids from ${apps} apps to ${file}`);
}

const parser = new ArgumentParser();
parser.add_argument("mode", { help: "What data should be loaded", choices: ["json", "js"] });
parser.add_argument("--minify", { help: "minify output", action: "store_true" });
parser.add_argument("output", { help: "output file base name", default: "steam_buyorder_ids", nargs: "?" });
exportIds(parser.parse_args());
