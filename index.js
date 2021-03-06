const fs = require('fs');
const readline = require('readline');
const os = require('os');
const util = require('util');
const asyncUnlink = util.promisify(fs.unlink);
const asyncWriteFile = util.promisify(fs.writeFile);
const asyncAppendFile = util.promisify(fs.appendFile);
const asyncExists = util.promisify(fs.exists);
const config = {shell: true};
const spawn = require('child_process').spawnSync;

const gradlePath = `${os.homedir()}/.gradle/gradle.properties`;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function exec(cmd) {
    let result = spawn(cmd, config);
    console.log('stdout:', result.stdout.toString());
    console.log('stderr:', result.stderr.toString());
}

function readLineAsync(message) {
    return new Promise((resolve) => {
        rl.question(message, (answer) => {
            resolve(answer);
        });
    });
}

function showMainMenu() {
    console.log("================ Easy proxy config tool ================");
    console.log("1: Press '1' to configure proxy with login and password.");
    console.log("2: Press '2' to configure proxy without credentials.");
    console.log("3: Press '3' to remove all proxies configurations.");
    console.log("Q: Press 'Q' to quit.");
}

function showProxyTypeMenu() {
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
            systemProp.https.proxyUser=${user}
            systemProp.https.proxyPassword=${password}
            systemProp.http.proxyUser=${user}
            systemProp.http.proxyPassword=${password}
            systemProp.http.proxyHost=${url}
            systemProp.http.proxyPort=${port}
            systemProp.https.proxyHost=${url}
            systemProp.https.proxyPort=${port}
            org.gradle.daemon=true
            org.gradle.parallel=true
            org.gradle.jvmargs=-Xmx1536m            
            `;
    } else {
        gradleFile = 
            `
            systemProp.http.proxyHost=${url}
            systemProp.http.proxyPort=${port}
            systemProp.https.proxyHost=${url}
            systemProp.https.proxyPort=${port}
            org.gradle.daemon=true
            org.gradle.parallel=true
            org.gradle.jvmargs=-Xmx1536m       
            `;
    }

    if(await asyncExists(gradlePath)) {
        console.log("A global gradle.properties file found.");
        console.log("1: Press '1' to create a new");
        console.log("2: Press '2' to append the proxy configuration to the existing file");
        let answer = await readLineAsync('Please selection one: ');
        switch (answer){
            case '1':
                await asyncWriteFile(gradlePath, gradleFile);
                break;
            case '2':
                await asyncAppendFile(gradlePath, gradleFile);
                break;
        }
    } else {
        await asyncWriteFile(gradlePath, gradleFile);
    }
    console.log('Gradle saved!');
}

function configureNpm(proxyUrl) {
    console.log(`Npm proxy requested: ${proxyUrl}`);
    exec(`npm config set proxy ${proxyUrl}`);
    exec('npm config get proxy');
    console.log(`Npm proxy added`);
}

function configureGit(proxyUrl) {
    console.log(`Git proxy requested: ${proxyUrl}`);
    exec(`git config --global http.proxy ${proxyUrl}`);
    exec(`git config --global --get-regexp http.*`);
    console.log(`Git proxy added`);
}

async function removeGradle() {
    try {
        console.info(`Removing global gradle.properties`);
        await asyncUnlink(gradlePath);
        console.info(`Global gradle.properties removed`);
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            // file doens't exist
            console.info("Global gradle.properties file doesn't exist, won't remove it.");
        } else if (err) {
            // other errors, e.g. maybe we don't have enough permission
            console.error("Error occurred while trying to remove global gradle.properties file");
        }
    }
}

function removeNpm() {
    console.log(`Removing Npm proxy.`);
    exec(`npm config delete proxy`);
    exec(`npm config get proxy`);
    console.log(`Npm proxy removed.`);
}

function removeGit() {
    console.log(`Removing Git proxy.`);
    exec('git config --global --unset http.proxy');
    exec('git config --global --get-regexp http.*');
    console.log(`Git proxy removed.`);
}

async function removeAllProxies() {
    await removeGradle();
    removeNpm();
    removeGit();
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
}

getProxyUrl()
    .then(console.log)
    .catch(console.error);