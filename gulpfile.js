/*!
 * ioBroker gulpfile
 * Date: 2019-01-28
 */
"use strict";

const gulp = require("gulp");
const fs = require("fs");
const pkg = require("./package.json");
const iopackage = require("./io-package.json");
const version = (pkg && pkg.version) ? pkg.version : iopackage.common.version;
const fileName = "words.js";
const EMPTY = "";

const languages = {
    en: {},
    de: {},
    ru: {},
    pt: {},
    nl: {},
    fr: {},
    it: {},
    es: {},
    pl: {},
    "zh-cn": {}
};
const terser = require('gulp-terser');
const concat = require('gulp-concat');

//TASKS

gulp.task("updatePackages", function (done) {
    iopackage.common.version = pkg.version;
    iopackage.common.news = iopackage.common.news || {};
    if (!iopackage.common.news[pkg.version]) {
        const news = iopackage.common.news;
        const newNews = {};

        newNews[pkg.version] = {
            en: "news",
            de: "neues",
            ru: "новое",
            pt: "novidades",
            nl: "nieuws",
            fr: "nouvelles",
            it: "notizie",
            es: "noticias",
            pl: "nowości",
            "zh-cn": "新"
        };
        iopackage.common.news = Object.assign(newNews, news);
    }
    fs.writeFileSync("io-package.json", JSON.stringify(iopackage, null, 4));
    done();
});

gulp.task("updateReadme", function (done) {
    const readme = fs.readFileSync("README.md").toString();
    const pos = readme.indexOf("## Changelog\n");
    if (pos !== -1) {
        const readmeStart = readme.substring(0, pos + "## Changelog\n".length);
        const readmeEnd = readme.substring(pos + "## Changelog\n".length);

        if (readme.indexOf(version) === -1) {
            const timestamp = new Date();
            const date = timestamp.getFullYear() + "-" +
                ("0" + (timestamp.getMonth() + 1).toString(10)).slice(-2) + "-" +
                ("0" + (timestamp.getDate()).toString(10)).slice(-2);

            let news = "";
            if (iopackage.common.news && iopackage.common.news[pkg.version]) {
                news += "* " + iopackage.common.news[pkg.version].en;
            }

            fs.writeFileSync("README.md", readmeStart + "### " + version + " (" + date + ")\n" + (news ? news + "\n\n" : "\n") + readmeEnd);
        }
    }
    done();
});

gulp.task("default", gulp.series("updatePackages", "updateReadme"));

//Compress ThreeJS Javascript files
gulp.task('compress-three', function () {
    const sourceJsFiles = [
        'node_modules/three/build/three.js',
        'node_modules/three/examples/js/controls/OrbitControls.js',
        'node_modules/three/examples/js/loaders/GLTFLoader.js',
    ];

    const targetFolder = 'widgets/vis-3dmodel/lib';
    const targetJsFile = 'three.min.js';

    return gulp.src(sourceJsFiles)
        .pipe(concat(targetJsFile))
        .pipe(terser())
        .pipe(gulp.dest(targetFolder));
});
//Compess Loglevel Javascript files
gulp.task('compress-loglevel', function () {
    const sourceJsFiles = [
        'node_modules/loglevel/dist/loglevel.js'
    ];

    const targetFolder = 'widgets/vis-3dmodel/lib';
    const targetJsFile = 'loglevel.min.js';

    return gulp.src(sourceJsFiles)
        .pipe(concat(targetJsFile))
        .pipe(terser())
        .pipe(gulp.dest(targetFolder));
});