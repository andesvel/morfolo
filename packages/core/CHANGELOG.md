# Changelog

## 0.1.0 (2026-10-30)


### Features

* **core:** add adapter registry ([34a2932](https://github.com/andesvel/morfolo/commit/34a29322369ec87c71a7f7ca901d06826d568343))
* **core:** add canvas and wasm adapter registries ([e515558](https://github.com/andesvel/morfolo/commit/e5155584f8fea7e1682edc49a3fe46f4f021a150))
* **core:** add conversion adapter interface ([06ebd59](https://github.com/andesvel/morfolo/commit/06ebd5902316cda28673eca7a84b67ecf46ff53f))
* **core:** add conversion types ([86b9eeb](https://github.com/andesvel/morfolo/commit/86b9eebbe48861ad7827af6688afd8102a35318c))
* **core:** add engine warm-up and status ([b98d2b0](https://github.com/andesvel/morfolo/commit/b98d2b078e5ab35c3e344920a82ed6a383479cd9))
* **core:** add format table and conversion catalog ([88e90ad](https://github.com/andesvel/morfolo/commit/88e90adf0ffa565afd4fbc3a544541ee589f8416))
* **core:** add load and progress hooks to adapter interface ([a85bf2e](https://github.com/andesvel/morfolo/commit/a85bf2eb41fb42817c2ee9afddfdac672796ff6a))
* **core:** add progress messages to worker protocol ([7b416cc](https://github.com/andesvel/morfolo/commit/7b416ccb692e1276274560e14a2589e9e099fba8))
* **core:** add worker message protocol ([f7a40db](https://github.com/andesvel/morfolo/commit/f7a40db859e8d9fa5ed71457fe093592f392bc2f))
* **core:** cache ffmpeg core and expose codec and image params ([a4362dd](https://github.com/andesvel/morfolo/commit/a4362ddc11b4938173045f1d6a15e662d415146d))
* **core:** dispatch wasm adapters on the main thread ([3ffb61f](https://github.com/andesvel/morfolo/commit/3ffb61f880739ffecce120951393c26bab94bbd2))
* **core:** export public conversion API ([1878363](https://github.com/andesvel/morfolo/commit/18783638ebce21ed2dc58632885674aa977c07d9))
* **core:** expose progress callback on convert ([ef77dfc](https://github.com/andesvel/morfolo/commit/ef77dfcf2cbecd35624016b06491cc1564f3cd58))
* **core:** implement canvas adapter for image conversion ([7e6cb0f](https://github.com/andesvel/morfolo/commit/7e6cb0fc7369a7256badc0068ff40bb13f161258))
* **core:** implement ffmpeg.wasm adapter ([08c3ef9](https://github.com/andesvel/morfolo/commit/08c3ef9a838f6e78f790f51428cfb4d1847070aa))
* **core:** post conversion jobs from the main thread ([b07ae51](https://github.com/andesvel/morfolo/commit/b07ae511bf44288ce2507d1892326efd9d7fa5b8))
* **core:** report conversion progress from the worker ([8779da1](https://github.com/andesvel/morfolo/commit/8779da1c871f566bd75968645327652a9af0efbf))
* **core:** run conversions inside a web worker ([36b0224](https://github.com/andesvel/morfolo/commit/36b0224759e9ae7ba54677c494216a44e199ccaf))
* **web:** landing, convert and settings views ([968ba2a](https://github.com/andesvel/morfolo/commit/968ba2a2ff642b32da4bda73e079888ef985b8d5))


### Bug Fixes

* **core:** drop first-frame-only gif from canvas adapter ([7d63649](https://github.com/andesvel/morfolo/commit/7d636497600e6be542eb973cd40842e53169a640))
* **core:** surface conversion failure details ([c80a2e1](https://github.com/andesvel/morfolo/commit/c80a2e1eb003c3034a257683015fb221b2d37e9d))


### Refactors

* **core:** align ffmpeg adapter with format table ([6a4cc7b](https://github.com/andesvel/morfolo/commit/6a4cc7bb822db0e44d7e1137ac6bb03de288e484))
* **core:** extract shared format and error helpers ([3489e91](https://github.com/andesvel/morfolo/commit/3489e9186dc05be405253efe9cd575d07de84579))


### Build

* **core:** make @morfolo/core publishable as 0.1.0 ([708d6e3](https://github.com/andesvel/morfolo/commit/708d6e338af6ae378e279c1583bbd28314ef4dd5))
* **core:** make @morfolo/core publishable as 0.1.0 ([c605dea](https://github.com/andesvel/morfolo/commit/c605dea7ae4fd0e55cdbf3d7895c1fe00289cc6f))
