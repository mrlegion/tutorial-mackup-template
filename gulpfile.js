// Global variable
var browser         = require('browser-sync');
var del             = require('del');
var fs              = require('fs');
var run             = require('run-sequence');
var gulp            = require('gulp');
var autoprefixer    = require('gulp-autoprefixer');
var cache           = require('gulp-cache');
var concat          = require('gulp-concat');
var filter          = require('gulp-filter');
var flatten         = require('gulp-flatten');
var imageresize     = require('gulp-image-resize');
var imagemin        = require('gulp-imagemin');
var jade            = require('gulp-jade');
var merge           = require('gulp-merge-json');
var rename          = require('gulp-rename');
var sass            = require('gulp-sass');
var sourcemaps      = require('gulp-sourcemaps');
var stylus          = require('gulp-stylus');
var yaml            = require('gulp-yaml');

// Plug-ins options
var options = {
    del : [
        'tmp',
        'dest'
    ],
    browser : {
        server : {
            baseDir : './dest'
        },
        notify : false
    },
    jade : {
        pretty: true
    },
    stylus : {
        'include css': true
    },
    autoprefixer : {
        browsers: ['last 2 versions'],
        cascade: false
    },
    imageresize : {
        full : {
            width : 1980,
            height : 1080,
            crop : true,
            upscale : true
        },
        small : {
            width : 760,
            height : 428,
            crop : true,
            upscale : true
        }
    }
};

// Clean and Browser sync main task
gulp.task('cleanup' , function() {
    return del(options.del);
});

gulp.task('browser-sync' , function() {
    return browser.init(options.browser);
});

// Stylus task
gulp.task('stylus' , function() {
    return gulp.src(['*.styl' , '!_*.styl'] , { cwd : './app/stylus' })
        .pipe(stylus(options.stylus))
        .pipe(autoprefixer(options.autoprefixer))
        .pipe(gulp.dest('./dest/stylesheets'))
        .pipe(browser.reload({stream : true}));
});

// Data json and yml task
gulp.task('yaml' , function() {
    return gulp.src(['**/*.yml' , '!**/_*.yml'] , { cwd : './app/jade' })
        .pipe(yaml({space: '\t'}))
        .pipe(merge('data-yaml.json'))
        .pipe(gulp.dest('./tmp/data'));
});

gulp.task('json' , function() {
    return gulp.src(['**/*.json' , '!**/_*.json'] , { cwd : './app/jade' })
        .pipe(merge('data-json.json'))
        .pipe(gulp.dest('./tmp/data'));
});

gulp.task('all-data' , function() {
    return gulp.src('**/*.json' , { cwd : './tmp/data' })
        .pipe(merge('data.json'))
        .pipe(gulp.dest('./tmp'));
});

// Jade task
gulp.task('jade' , function() {
    var json = JSON.parse(fs.readFileSync('./tmp/data.json'));
    options.jade.locals = json;

    return gulp.src(['**/*.jade' , '!**/_*.jade'] , { cwd : './app/jade' })
        .pipe(filter(function (file) {
            return !/app[\\\/]jade[\\\/]components/.test(file.path);
        }))
        .pipe(jade(options.jade))
        .pipe(flatten())
        .pipe(gulp.dest('./dest'))
        .pipe(browser.reload({stream : true}));
});

// Scripts task
gulp.task('scripts' , function() {
    return gulp.src(['**/*.js' , '!**/_*.js'] , { cwd : './app/javascript' })
        .pipe(flatten())
        .pipe(concat('core.js'))
        .pipe(gulp.dest('./dest/javascript/'))
        .pipe(browser.reload({stream: true}));
});

// Transfer library tasks
gulp.task('images' , function() {
    return gulp.src(['**/*.{jpg,jpeg,png,gif}' , '!**/_*.{jpg,jpeg,png,gif}'] , { cwd : '.app/assets' })
        .pipe(cache(imagemin({progressive: true})))
        .pipe(gulp.dest('./dest/assets'))
        .pipe(browser.reload({stream: true}));
});

gulp.task('svg' , function() {
    return gulp.src(['**/*.svg' , '!**/_*.svg'] , { cwd : './app/assets/' })
        .pipe(gulp.dest('./dest/assets/'))
        .pipe(browser.reload({stream: true}));
});

gulp.task('lib-scripts' , function() {
    return gulp.src('**/*.js', { cwd : './app/assets/' })
        // .pipe(flatten())
        .pipe(gulp.dest('./dest/javascripts/'))
        .pipe(browser.reload({stream: true}));
});

gulp.task('lib-styles' , function() {
    return gulp.src('**/*.css', { cwd : './app/assets/' })
        // .pipe(rename({suffix: '.min'}))
        // .pipe(flatten())
        .pipe(gulp.dest('./dest/stylesheets/'))
        .pipe(browser.reload({stream: true}));
});

// SERVER TASK
// Compile all data json and yaml
gulp.task('data' , function (cb) {
    return run(
        [
            'yaml',
            'json'
        ],
        'all-data',
        cb
    );
});

gulp.task('html' , function (cb) {
    return run(
        ['data'],
        'jade',
        cb
    );
});

// Library transfer task
gulp.task('assets' , function (cb) {
    return run(
        'images',
        'svg',
        'lib-scripts',
        'lib-styles',
        cb
    );
});

// MAIN TASK
// Build project task
gulp.task('build' , function(cb) {
    return run(
        'cleanup',
        [
            'html',
            'assets'
        ],
        'stylus',
        cb
    );
});

// Develop task (use when codding)
gulp.task('dev' , function(cb) {
    return run(
        'build',
        [
            'browser-sync',
            'watch'
        ],
        cb
    );
});

// Watchers task
// Watch
gulp.task('watch' , function(cb) {

    // Modules, pages
    gulp.watch('./app/**/*.jade' , ['jade']);

    // Modules data
    gulp.watch(['./app/jade/*.{json,yml}'] , ['html']);

    // Statics styles
    gulp.watch('./app/stylus/**/*.styl' , ['stylus']);

    // Scripts file
    gulp.watch('./app/javascript/**/*.js' , ['scripts']);

    // Images file
    gulp.watch('./app/assets/images/**/*.{jpg,jpeg,png,gif}' , ['images']);

    // SVG file
    gulp.watch('./app/assets/svg/**/*.svg' , ['svg']);

    // Assets file
    gulp.watch('./app/assets/**/*' , ['assets']);
});