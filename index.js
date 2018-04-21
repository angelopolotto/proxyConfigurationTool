const fs = require('fs');
const readline = require('readline');
const os = require('os');
const util = require('util');

let config = {stdio: 'inherit', shell: true};
const exec = util.promisify(require('child_process').exec);

const gradlePath = `${os.homedir()}/.gradle/gradle.properties`;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function readLineAsync(message) {
    return new Promise((resolve) => {
        rl.question(message, (answer) => {
            resolve(answer);
        });
    });
}

function showMainMenu() {
    console.log("1: Press '1' to configure proxy with login and password.");
    console.log("2: Press '2' to configure proxy without credentials.");
    console.log("3: Press '3' to remove all proxies configurations.");
    console.log("Q: Press 'Q' to quit.");
}

function showProxyTypeMenu() {
    console.log("================ Easy proxy config ================");
    console.log("1: Press '1' to configure Gradle proxy.");
    console.log("2: Press '2' to configure Git proxy.");
    console.log("3: Press '3' to configure Npm proxy.");
    console.log("Q: Press 'Q' to quit.");
}

async function configureGradle(user, password, url, port, authentication) {
    let gradleFile;
    if (authentication) {
        gradleFile =
            `
            user = ${user}
            password = ${password}
            url = ${url}
            port = ${port}
            systemProp.http.proxyPort=port
            org.gradle.daemon=true
            systemProp.http.proxyUser=user
            org.gradle.parallel=true
            systemProp.http.proxyPassword=password
            org.gradle.jvmargs=-Xmx1536m
            systemProp.https.proxyPassword=password
            systemProp.https.proxyHost=url
            systemProp.http.proxyHost=url
            systemProp.https.proxyPort=port
            systemProp.https.proxyUser=user
            `;
    } else {
        gradleFile =
            `
            url = ${url}
            port = ${port}
            systemProp.http.proxyPort=port
            org.gradle.daemon=true
            org.gradle.parallel=true
            org.gradle.jvmargs=-Xmx1536m
            systemProp.https.proxyHost=url
            systemProp.http.proxyHost=url
            systemProp.https.proxyPort=port
            `;
    }
    fs.writeFile(gradlePath, gradleFile, (err) => {
        if (err) throw err;
        console.log('Gradle saved!');
    });
}

async function configureNpm(proxyUrl) {
    console.log(`Npm proxy requested: ${proxyUrl}`);

    const {stdout, stderr} = await exec(`npm config set proxy ${proxyUrl}`, config);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);

    const {stdout2, stderr2} = await exec('npm config get proxy', config);
    console.log('stdout:', stdout2);
    console.log('stderr:', stderr2);

    console.log(`Npm proxy added`);
}

async function configureGit(proxyUrl) {
    console.log(`Git proxy requested: ${proxyUrl}`);

    const {stdout, stderr} = await exec(`git config --global http.proxy ${proxyUrl}`, config);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);

    const {stdout2, stderr2} = await exec(`git config --global --get-regexp http.*`, config);
    console.log('stdout:', stdout2);
    console.log('stderr:', stderr2);

    console.log(`Git proxy added`);
}

async function removeAllProxies() {
    fs.unlink(gradlePath, function (err) {
        if (err && err.code === 'ENOENT') {
            // file doens't exist
            console.info("Global gradle.properties file doesn't exist, won't remove it.");
        } else if (err) {
            // other errors, e.g. maybe we don't have enough permission
            console.error("Error occurred while trying to remove global gradle.properties file");
        } else {
            console.info(`Global gradle.properties removed`);
        }
    });

    console.log(`Removing Npm proxy.`);
    const {stdout, stderr} = await exec(`npm config delete proxy`, config);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
    const {stdout2, stderr2} = await exec(`npm config get proxy`, config);
    console.log('stdout:', stdout2);
    console.log('stderr:', stderr2);
    console.log(`Npm proxy removed.`);

    console.log(`Removing Git proxy.`);
    const {stdout3, stderr3} = await exec('git config --global --unset http.proxy', config);
    console.log('stdout:', stdout3);
    console.log('stderr:', stderr3);
    const {stdout4, stderr4} = await exec('git config --global --get-regexp http.*', config);
    console.log('stdout:', stdout4);
    console.log('stderr:', stderr4);
    console.log(`Git proxy removed.`);
}

async function getProxyType(user, password, url, port, authentication) {
    showProxyTypeMenu();
    let proxyUrl;
    if (authentication) {
        proxyUrl = `${user}:${password}@${url}:${port}`;
    } else {
        proxyUrl = `${url}:${port}`;
    }
    let answer = await readLineAsync('Please selection one: ');
    switch (answer) {
        case '1':
            //Gradle proxy
            await configureGradle(user, password, url, port, authentication);
            break;
        case '2':
            //Git proxy
            await configureGit(proxyUrl);
            break;
        case '3':
            //Npm proxy
            await configureNpm(proxyUrl);
            break;
        case 'q':
            break;
    }
}

async function getProxyUrl() {
    showMainMenu();
    let answer = await readLineAsync('Please selection one: ');
    let url, port;
    switch (answer) {
        case '1':
            //Proxy with authentication
            url = await readLineAsync('Type the proxy URL: ');
            port = await readLineAsync('Type the proxy Port: ');
            let user = await readLineAsync('Type the proxy User: ');
            let password = await readLineAsync('Type the proxy Password: ');
            await getProxyType(user, password, url, port, true);
            break;
        case '2':
            //Proxy without authentication
            //Proxy with authentication
            url = await readLineAsync('Type the proxy URL: ');
            port = await readLineAsync('Type the proxy Port: ');
            await getProxyType('', '', url, port, false);
            break;
        case '3':
            //Remove all proxies
            await removeAllProxies();
            break;
        case 'q':
            break;
    }
    rl.close();
    console.log("Program finished!");
    process.exit(0);
}

getProxyUrl()
    .then(console.log)
    .catch(console.error);