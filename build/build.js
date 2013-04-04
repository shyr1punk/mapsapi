/**
 * Main build script of 2GIS Maps API 2.0
 *
 * Version 2.0.0
 *
 * Copyright (c) 2013, 2GIS
 */
var fs = require('fs'),
    jshint = require('jshint').JSHINT,
    uglify = require('uglify-js'),
    argv = require('optimist').argv,
    clc = require('cli-color');

var config = require('./config.js').config,
    packages = require('./packs.js').packages,
    hint = require('./hintrc.js');

/**
 * Global data stores
 */
var modules,
    copyrights,
    errors = [];

/**
 * CLI colors theme settings
 * See: https://github.com/medikoo/cli-color
 */
var okMsg = clc.xterm(34),
    errMsg = clc.xterm(9),
    depsMsg = clc.xterm(27);

/**
 * Get content of source files all modules
 * For best performance must run only 1 time on start app or run CLI script
 *
 * @returns {Object}
 */
function getModulesData() {
    var source = config.source,
        modules = {};

    for (var creator in source) {
        if (source.hasOwnProperty(creator)) {
            var modulesList = source[creator].deps,
                basePath = source[creator].path;

            for (var moduleName in modulesList) {
                if (modulesList.hasOwnProperty(moduleName)) {
                    var moduleConf = modulesList[moduleName];

                    modules[moduleName] = {};
                    modules[moduleName].js = proccessJs(moduleConf.src, basePath);
                    modules[moduleName].css = proccessCss(moduleConf.css, basePath);
                    modules[moduleName].conf = proccessSkinConf(moduleConf.src, basePath);
                    modules[moduleName].deps = modulesList[moduleName].deps;

                    proccessImg();
                }
            }
        }
    }

    return modules;
}

/**
 * Get content of JS files
 *
 * @param {Array} srcList  List of path to JS files
 * @param {String} basePath  Base path of JS files
 * @returns {Object}
 */
function proccessJs(srcList, basePath) {
    var jsContent = {};

    if (srcList) {
        for (var i = 0, count = srcList.length; i < count; i++) {
            var srcPath = basePath + srcList[i];
            if (srcPath.indexOf(config.skinVar) < 0) {
                if (fs.existsSync(srcPath)) {
                    jsContent[srcPath] = fs.readFileSync(srcPath, 'utf8') + '\n\n';
                } else {
                    console.log(errMsg('Error! File ' + srcPath + ' not found!\n'));
                }
            }
        }
    }

    return jsContent;
}

/**
 * Get content of JS skins config files
 *
 * @param {Array} srcList  List of path to JS files
 * @param {String} basePath  Base path of JS files
 * @returns {Object}
 */
function proccessSkinConf(srcList, basePath) {
    var skinConfContent = {},
        skinVar = config.skinVar;

    if (srcList) {
        for (var i = 0, count = srcList.length; i < count; i++) {
            var srcPath = basePath + srcList[i];

            if (srcPath.indexOf(skinVar) > 0) {
                var skinsPath = srcPath.split(skinVar);
                var skinsList = fs.readdirSync(skinsPath[0]);

                for (var j = 0, cnt = skinsList.length; j < cnt; j++) {
                    var skinName = skinsList[j];
                    var skinPath = skinsPath[0] + skinName + skinsPath[1];
                    if (fs.existsSync(skinPath)) {
                        skinConfContent[skinName] = fs.readFileSync(skinPath, 'utf8') + '\n';
                    }
                }
            }
        }
    }

    return skinConfContent;
}

/**
 * Get content of CSS files each skins (+ IE support)
 *
 * @param {Object} srcConf  Config of path to CSS files
 * @param {String} basePath  Base path of CSS files
 * @returns {Object}
 */
function proccessCss(srcConf, basePath) {
    var cssContent = {},
        skinVar = config.skinVar;

    for (var browser in srcConf) {
        if (srcConf.hasOwnProperty(browser)) {
            var browserCssList = srcConf[browser];

            for (var i = 0, count = browserCssList.length; i < count; i++) {
                var srcPath = basePath + browserCssList[i];

                if (srcPath.indexOf(skinVar) > 0) {
                    var skinsPath = srcPath.split(skinVar);
                    var skinsList = fs.readdirSync(skinsPath[0]);

                    for (var j = 0, cnt = skinsList.length; j < cnt; j++) {
                        var skinName = skinsList[j];
                        var skinPath = skinsPath[0] + skinName + skinsPath[1];
                        if (fs.existsSync(skinPath)) {
                            cssContent[skinName] = cssContent[skinName] || {};
                            cssContent[skinName][browser] = cssContent[skinName][browser] || {};
                            cssContent[skinName][browser][skinPath] = fs.readFileSync(skinPath, 'utf8') + '\n';
                        }
                    }
                } else {
                    cssContent.basic = cssContent.basic || {};
                    cssContent.basic[browser] = cssContent.basic[browser] || {};
                    cssContent.basic[browser][srcPath] = fs.readFileSync(srcPath, 'utf8') + '\n';
                }
            }
        }
    }

    return cssContent;
}



function proccessImg() {

}

/**
 * Get content of source files all copyrights
 * Must run only 1 time on start app or run CLI script
 *
 * @returns {String}
 */
function getCopyrightsData() {
    var source = config.copyrights,
        copyrights = '';

    for (var i = 0, count = source.length; i < count; i++) {
        copyrights += fs.readFileSync(source[i], 'utf8') + '\n';
    }

    return copyrights;
}

/**
 * Generates a list of modules by pkg
 *
 * @param {String|Null} pkg  Name of package, module or list of modules
 * @param {Boolean} isMsg  Show messages on run CLI mode
 * @returns {Array}
 */
function getModulesList(pkg, isMsg) {
    var modulesListOrig = [],
        modulesListRes = [],
        loadedModules = {};

    // Package name with no empty modules list on packs.js (example: 'base')
    if (pkg && packages.hasOwnProperty(pkg) && packages[pkg].modules.length > 0) {
        modulesListOrig = packages[pkg].modules;

    // Modules list (example: 'Core,JSONP,TileLayer')
    } else if (pkg && pkg.indexOf(',') > 0) {
        modulesListOrig = pkg.split(',');

    // Modules single (example: 'Core')
    } else if (pkg && modules.hasOwnProperty(pkg)) {
        modulesListOrig.push(pkg);

    // Others (null / full package / not correct value)
    } else {
        for (var mod in modules) {
            if (modules.hasOwnProperty(mod)) {
                modulesListOrig.push(mod);
            }
        }
    }

    if (isMsg) {
        console.log('Build modules:');
    }

    for (var i = 0, count = modulesListOrig.length; i < count; i++) {
        var moduleName = modulesListOrig[i];

        if (modules.hasOwnProperty(moduleName)) {
            if (modules[moduleName].deps) {
                var moduleDeps = modules[moduleName].deps;
                for (var j = 0, cnt = moduleDeps.length; j < cnt; j++) {
                    var moduleNameDeps = moduleDeps[j];
                    if (!loadedModules[moduleNameDeps]) {
                        modulesListRes.push(moduleNameDeps);
                        loadedModules[moduleNameDeps] = true;
                        if (isMsg) {
                            console.log(depsMsg('  + ' + moduleNameDeps + ' (deps of ' + moduleName + ')'));
                        }
                    }
                }
            }

            if (!loadedModules[moduleName]) {
                modulesListRes.push(moduleName);
                loadedModules[moduleName] = true;
                if (isMsg) {
                    console.log('  * ' + moduleName);
                }
            }
        } else {
            if (isMsg) {
                console.log(errMsg('  - ' + moduleName + ' (not found)'));
                errors.push('Unknown modules');
            }
        }
    }

    return modulesListRes;
}

/**
 * Generates build content
 *
 * @param {Array} modulesList
 * @param {Boolean} isMsg  Show messages on run CLI mode
 * @returns {String}
 */
function makeJSPackage(modulesList, skin, isMsg) {
    var loadedFiles = {},
        countModules = 0,
        result = '';

    for (var i = 0, count = modulesList.length; i < count; i++) {
        var moduleName = modulesList[i],
            moduleData = modules[moduleName];

        if (moduleData && moduleData.js) {
            var moduleSrc = moduleData.js;
            countModules++;

            // Load skins config (if exist) before main module code
            if (moduleData.conf) {
                var moduleSkins = moduleData.conf;
                var loadSkinsList = [];

                if (moduleSkins.hasOwnProperty('basic')) {
                    loadSkinsList.push('basic');
                }

                if (moduleSkins.hasOwnProperty(skin) || moduleSkins.hasOwnProperty('default')) {
                    var moduleSkinName = skin || 'default';
                    loadSkinsList.push(moduleSkinName);
                }

                for (var j = 0, cnt = loadSkinsList.length; j < cnt; j++) {
                    var moduleSkinName = loadSkinsList[j],
                        moduleSkinId = moduleSkinName + ':' + moduleName;
                    if (!loadedFiles[moduleSkinId]) {
                        result += moduleSkins[moduleSkinName];
                        loadedFiles[moduleSkinId] = true;
                    }
                }
            }

            // Load main module code
            for (var file in moduleSrc) {
                if (moduleSrc.hasOwnProperty(file)) {
                    if (!loadedFiles[file]) {
                        result += moduleSrc[file];
                        loadedFiles[file] = true;
                    }
                }
            }
        }
    }

    if (isMsg) {
        console.log('\nConcatenating JS in ' + countModules + ' modules...\n');
    }

    return copyrights + config.intro + result + config.outro;
}

/**
 * Generates build content
 *
 * @param {Array} modulesList
 * @param {String} skin
 * @param {Boolean} isIE
 * @param {Boolean} isMsg  Show messages on run CLI mode
 * @returns {String}
 */
function makeCSSPackage(modulesList, skin, isIE, isMsg) {
    var loadedFiles = {},
        countModules = 0,
        result = '';

    for (var i = 0, count = modulesList.length; i < count; i++) {
        var moduleName = modulesList[i],
            moduleData = modules[moduleName];

        if (moduleData && moduleData.css) {
            var moduleSkins = moduleData.css;




            if (moduleSkins.hasOwnProperty('basic')) {

                var moduleBrowser = moduleSkins['basic'];

                if (moduleBrowser.hasOwnProperty('all')) {
                    var moduleSrc = moduleBrowser['all'];

                    countModules++;

                    for (var file in moduleSrc) {
                        if (moduleSrc.hasOwnProperty(file)) {
                            if (!loadedFiles[file]) {
                                result += moduleSrc[file];
                                loadedFiles[file] = true;
                            }
                        }
                    }
                }

                if (isIE && moduleBrowser.hasOwnProperty('ie')) {
                    var moduleSrc = moduleBrowser['ie'];
                    for (var file in moduleSrc) {
                        if (moduleSrc.hasOwnProperty(file)) {
                            if (!loadedFiles[file]) {
                                result += moduleSrc[file];
                                loadedFiles[file] = true;
                            }
                        }
                    }
                }

            }

            if (moduleSkins.hasOwnProperty(skin) || moduleSkins.hasOwnProperty('default')) {

                var skinName = skin || 'default';
                var moduleBrowser = moduleSkins[skinName];

                if (moduleBrowser.hasOwnProperty('all')) {
                    var moduleSrc = moduleBrowser['all'];
                    for (var file in moduleSrc) {
                        if (moduleSrc.hasOwnProperty(file)) {
                            if (!loadedFiles[file]) {
                                result += moduleSrc[file];
                                loadedFiles[file] = true;
                            }
                        }
                    }
                }

                if (isIE && moduleBrowser.hasOwnProperty('ie')) {
                    var moduleSrc = moduleBrowser['ie'];
                    for (var file in moduleSrc) {
                        if (moduleSrc.hasOwnProperty(file)) {
                            if (!loadedFiles[file]) {
                                result += moduleSrc[file];
                                loadedFiles[file] = true;
                            }
                        }
                    }
                }
            }
        }
    }

    if (isMsg) {
        console.log('\nConcatenating CSS in ' + countModules + ' modules...\n');
    }

    //console.log(result);

    return result;
}

/**
 * Minify source files
 *
 * @param {String} content  Source content of JS file
 * @param {Boolean} isDebug  Is minify JS file
 * @return {String} Result content of JS file
 */
function minifyPackage(content, isDebug) {
    if (isDebug) {
        return content;
    }

    var min = uglify.minify(content, {
        warnings: true,
        fromString: true
    }).code;

    return copyrights + min;
}


/**
 * Check JS files for errors
 *
 * @param {Object} modules
 */
function lintFiles(modules) {
    var errorsCount = 0;

    console.log('\nCheck all source JS files for errors with JSHint...\n');

    for (var mod in modules) {
        if (modules.hasOwnProperty(mod)) {
            var fileList = modules[mod].src;
            for (var file in fileList) {
                if (fileList.hasOwnProperty(file)) {

                    jshint(fileList[file], hint.config, hint.namespace);
                    var errorsList = jshint.errors;

                    for (var i = 0, count = errorsList.length; i < count; i++) {
                        var e = errorsList[i];
                        console.log('  ' + file + '    line ' + e.line + ' col ' + e.character + '    ' + e.reason);
                        errorsCount++;
                    }
                }
            }
        }
    }

    if (errorsCount > 0) {
        console.log(errMsg('\nJSHint find ' + errorsCount + ' errors.\n'));
        errors.push('JSHint');
    } else {
        console.log('JSHint not find errors.\n');
    }

}


/**
 * Lint (CLI command)
 */
exports.lint = function() {
    modules = getModulesData();
    lintFiles(modules);
};

/**
 * Build (CLI command)
 */
exports.build = function() {
    var modulesList,
        jsSrcContent,
        jsMinContent,
        cssSrcContent,
        cssMinContent,
        jsDest = config.js.custom,
        cssDest = config.css.custom,
        pkg = argv.p || argv.m || argv.pkg || argv.mod,
        skin = argv.skin || 'default';

    modules = modules || getModulesData();
    copyrights = getCopyrightsData();

    if (pkg === 'public') {
        jsDest = config.js.public;
        cssDest = config.css.public;
        console.log('Build public GitHub full package!\n');
    }

    console.log('Skin: ' + skin + '\n');

    modulesList = getModulesList(pkg, true);

    jsSrcContent = makeJSPackage(modulesList, skin, true);
    cssSrcContent = makeCSSPackage(modulesList, skin, true, true);

    fs.writeFileSync(jsDest.src, jsSrcContent);
    fs.writeFileSync(cssDest.src, cssSrcContent);

    console.log('Compressing JS...\n');

    jsMinContent = minifyPackage(jsSrcContent);
    fs.writeFileSync(jsDest.min, jsMinContent);

    console.log('   Uncompressed size: ' + (jsSrcContent.length/1024).toFixed(1) + ' KB');
    console.log('   Compressed size:   ' + (jsMinContent.length/1024).toFixed(1) + ' KB');

    console.log('\nCompressing CSS...\n');

    //cssMinContent = minifyPackage(cssSrcContent);
    cssMinContent = cssSrcContent;
    fs.writeFileSync(cssDest.min, cssMinContent);

    console.log('   Uncompressed size: ' + (cssSrcContent.length/1024).toFixed(1) + ' KB');
    console.log('   Compressed size:   ' + (cssMinContent.length/1024).toFixed(1) + ' KB');

    if (errors.length > 0) {
        console.log(errMsg('\nBuild ended with errors! [' + errors + ']'));
    } else {
        console.log(okMsg('\nBuild successfully completed!'));
    }

};

/**
 * Load content of all source JS files to memory (web app)
 * Must run only 1 time on start app
 */
exports.init = function() {
    modules = getModulesData();
    copyrights = getCopyrightsData();
    if (modules && copyrights) {
        console.log(okMsg('Load source files successfully completed'));
    } else {
        console.log(errMsg('Load source files ended with errors!'));
    }
};

/**
 * Get JS content (web app)
 *
 * @param {String|Null} pkg  Name of package, module or list of modules
 * @param {Boolean} isDebug  Is skip minify JS result file
 * @param {Function} callback  Return JS result file
 */
exports.getJS = function(pkg, isDebug, callback) {
    var modulesList, contentSrc, contentRes;
    modulesList = getModulesList(pkg);
    contentSrc = makeJSPackage(modulesList, 'default');
    contentRes = minifyPackage(contentSrc, isDebug);
    callback(contentRes);
};

/**
 * Get CSS content (web app)
 *
 * @param {String|Null} pkg  Name of package, module or list of modules
 * @param {Boolean} isDebug  Is skip minify CSS result file
 * @param {Function} callback  Return CSS result file
 */
exports.getCSS = function(pkg, isDebug, callback) {
    var modulesList, contentSrc, contentRes;
    modulesList = getModulesList(pkg);
    contentSrc = makeCSSPackage(modulesList, 'basic');
    //contentRes = minifyPackage(contentSrc, isDebug);
    callback(contentSrc);
};
