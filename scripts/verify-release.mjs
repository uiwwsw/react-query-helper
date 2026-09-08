import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const ref = process.env.GITHUB_REF;
if (!/^\d+\.\d+\.\d+$/.test(version) || ref !== `refs/tags/v${version}`) {
  throw new Error(
    `Publish requires tag v${version} matching package.json; received ${ref}.`,
  );
}
console.log(`Verified release tag v${version}.`);
