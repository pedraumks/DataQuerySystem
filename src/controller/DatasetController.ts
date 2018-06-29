/**
 * Created by rtholmes on 2016-09-03.
 */

import Log from "../Util";
import JSZip = require('jszip');
import fs = require('fs');
import path = require('path');
import HTMLController from "./HTMLController";


/**
 * In memory representation of all datasets.
 */
export interface Datasets {
    [id: string]: {};
}

export default class DatasetController {

    private datasets: Datasets = {};
    private  DATA_PATH: string = './data/';
    private indexRooms: Array<string>;

    constructor() {
        Log.trace('DatasetController::init()');
    }

    /**
     * Deletes dataset with passed id from memory and disk
     * @param id dataset id
     * @returns {number} response code
     */
    public deleteDataset(id: string): Promise<number> {
        Log.trace('DatasetController::deleteDataset( ' + id + ' )');
        let that = this;
        return new Promise(function(fulfill, reject) {
            let numCode = 404;
            let filepath = path.join(that.DATA_PATH, id + '.json');
            if (that.datasets.hasOwnProperty(id)) { // Loaded in  memory already
                delete that.datasets[id]; // Remove from memory
                numCode = 204;
            }
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath); // Think fs.delete(filepath) if it were named better
                numCode = 204;
            }
            console.log(numCode);
            if (numCode === 204) {
                fulfill(numCode)
            } else {
                reject(numCode);
            }
        });
    }

    /**
     * Returns the referenced dataset. If the dataset is not in memory, it should be
     * loaded from disk and put in memory. If it is not in disk, then it should return
     * null.
     *
     * @param id
     * @returns {{}}
     */
    public getDataset(id: string): any {
        Log.trace('DatasetController::getDataset( ' + id + ' )');
        if (this.datasets.hasOwnProperty(id)) { // Loaded in  memory already
            return this.datasets[id];
        } else if (fs.existsSync(this.DATA_PATH)) { // Some dataset has been stored on disk
            this.loadFileToMem(this.DATA_PATH, id);
            return this.datasets[id];
        } else {
            return null;
        }
    }

    /**
     * If nothing is loaded into this.datasets, load all datasets in memory
     * @returns {Datasets}
     */
    public getDatasets(): Datasets {
        Log.trace('DatasetController::getDatasets');
        if (fs.existsSync(this.DATA_PATH) && Object.keys(this.datasets).length === 0) {
            let filenames: string[] = fs.readdirSync(this.DATA_PATH);
            for (var i = 0; i < filenames.length; i++) {
                this.loadFileToMem(this.DATA_PATH, filenames[i]); // TODO put return into then()
            }
        }
        return this.datasets;
    }

    public loadFileToMem(dir: string, id: string): void {
        Log.trace('DatasetController::loadFileToMem( ' + id + '... )');
        let fullpath: string = path.join(dir, id);
        try { // Try to load
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            let content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
            let key: string = id.split('.')[0];
            this.datasets[key] = content; // Load to mem
        } catch (err) {
            Log.trace('DatasetController::loadFileToMem(..) - load error: ' + err.message);
        }
    }

    /**
     * Process the dataset; save it to disk when complete.
     * @param id
     * @param data base64 representation of a zip file
     * @returns {Promise<boolean>} returns true if successful; false if the dataset was invalid (for whatever reason)
     */
    public process(id: string, data: any): Promise<number> {
        Log.trace('DatasetController::process( ' + id + '... )');
        let that = this;
        return new Promise(function (fulfill, reject) {
            try {
                let myZip = new JSZip();
                myZip.loadAsync(data, {base64: true}).then(function (zip: JSZip) { // Load zip to JSZip object
                    Log.trace('DatasetController::process(..) - unzipped');
                    that.loadDatasetToMemory(id, zip).then(function (result: Datasets)  {
                        that.save(id, result)
                            .then(function (result) {
                                fulfill(result);
                            })
                            .catch(function (err) {
                            Log.trace('DatasetController::process(..) - rejecting with - ' + err);
                            reject(err);
                        });
                    }).catch(function (err) {
                        Log.trace('DatasetController::process(..) - rejecting with - ' + err);
                        reject(err);
                    });
                }).catch(function (err) {
                    Log.trace('DatasetController::process(..) - unzip ERROR: ' + err.message)
                    reject(err);
                });
            } catch (err) {
                Log.trace('DatasetController::process(..) - ERROR: ' + err);
                reject(err);
            }
        });
    }

    /**
     * Creates a new dataset object, aysnchronously reads files from zip and adds them to the dataset
     * @param zip JSZip object to iterate through the files of
     * @returns {Promise<Datasets>} Populated dataset
     */
    private loadDatasetToMemory(id:string, zip: JSZip): Promise<Datasets> {
        let that = this;
        let dataset: Datasets = {}; // Dataset to eventually add to memory and disk
        Log.trace('DatasetController::loadDatasetToMemory(..) - Starting');
        return new Promise(function (fulfill, reject) {
            try {
                var promiseArr: Promise<boolean>[] = []; // Make array to add individual files to
                for (let item of Object.keys(zip.files)) {
                    promiseArr.push(that.saveFile(id, item, zip, dataset)); // Add promise to array
                }
                // If there are files added
                if (promiseArr.length > 0) {
                    // Once all files are done
                    Promise.all(promiseArr).then(function () {
                        // If it's a building dataset
                        if (id === 'rooms') {
                            var locPromiseArr: Promise<boolean>[] = [];
                            // For each building
                            for(var key of Object.keys(dataset)) {
                                // If we're not supposed to load that building, delete it
                                if (that.indexRooms.indexOf(key) === -1) {
                                    delete dataset[key];
                                } else {
                                    // Add the room array from that building to what we need to get
                                    let rooms = (<any>dataset[key])['result'];
                                    locPromiseArr.push(HTMLController.addLocData(rooms));
                                }
                            }
                            // Wait for get requests for location data to come back
                            Promise.all(locPromiseArr).then(function() {
                                fulfill(dataset);
                            }).catch(function(err) {
                                reject(err);
                            });
                        } else {
                            Log.trace('DatasetController::loadDatasetToMemory(..) - Loaded');
                            fulfill(dataset); // Wait for all files to read before returning dataset
                        }
                    }).catch(function(err) {
                        reject(err);
                    });
                } else {
                    reject("No content to load");
                }

            } catch (err) {
                Log.trace('DatasetController::loadDatasetToMemory(..) - unzip ERROR: ' + err.message);
                reject(err);
            }
        });
    }

    /***
     * Helper method to load given file in the zip
     * @param filename name of file from unzipped zip
     * @param zip full zip file
     * @param dataset dataset to add read content to
     * @returns {Promise<boolean>} true if read successful
     */
    private saveFile(id: string, filename: string, zip: JSZip, dataset: Datasets): Promise<boolean> {
        let that = this;
        return new Promise(function (fulfill, reject) {
            if (filename[filename.length - 1] === '/' || filename.indexOf('DS_Store') !== -1) {
                fulfill(true)
            } else {
                zip.file(filename).async("string").then(function (content) {
                    // If it's a courses dataset, simply read the json
                    if(id === 'courses') {
                        try {
                            dataset[filename] = JSON.parse(content); // Change content to JSON, save as {"filename":JSON} entry
                            fulfill(true);
                        } catch (err) {
                            reject(false);
                        }
                    } else if (id === 'rooms') {
                        let ctr = new HTMLController(content);
                        // Ugly check to see if the expected body exists. Not good but it works
                        if(!ctr.sketchyValidityCheck()) {
                            reject('Bad dataset');
                        }
                        // If it's an index file, grab the rooms in the index and move on
                        if (filename.indexOf('index') !== -1) {
                            that.indexRooms = ctr.parseIndex();
                            fulfill(true);
                        } else {
                            // Split the file name and grab the last part, which is the file name
                            let splitOnDir = filename.split('/');
                            let shortname: string = splitOnDir[splitOnDir.length - 1];
                            let rooms: Array<any> = [];
                            // Get data for this building, excluding lat and lon data
                            try {
                                rooms = ctr.parseBuilding(shortname);
                                // Add data into the dataset
                                dataset[shortname] = rooms;
                            } catch (err) {
                                //Log.trace('DatasetController::saveFile(..) - Data missing in ' + shortname + ' , skipping');
                            }
                            fulfill(true);
                        }
                    } else {
                        reject('Expecting id = courses or rooms'); // TODO this might not be what we want
                    }
                }).catch(function (err) {
                    reject(err);
                })
            }

        })
    }

    /**
     * Writes the processed dataset to disk as 'id.json'. The function should overwrite
     * any existing dataset with the same name.
     * @param id
     * @param processedDataset
     */
    private save(id: string, processedDataset: Datasets): Promise<number> {
        let that = this;
        return new Promise(function (fulfill, reject) {
            let respCode: number = 204;
            let fullpath: string = path.join(that.DATA_PATH, id + '.json'); // ./data/id.json
            try {
                if (that.datasets.hasOwnProperty(id)) { // Some version of same dataset loaded
                    respCode = 201;
                }
                try {
                    fs.accessSync(fullpath, fs.F_OK); // Some version of same dataset saved
                    respCode = 201
                } catch (err) {
                    // Nothing
                }
                that.datasets[id] = processedDataset;
                if(!fs.existsSync(that.DATA_PATH)) { // Check if data folder exists, create if not
                    fs.mkdir(that.DATA_PATH);
                    Log.trace('DatasetController::save(..) - Creating directory ./data');
                }
                fs.writeFile(fullpath, JSON.stringify(processedDataset));
                Log.trace('DatasetController::save(..) - Save successful');
                fulfill(respCode);
            } catch (err) {
                Log.trace('DatasetController::save(..) - save ERROR: ' + err.message);
                reject("Error saving dataset to disk");
            }
        })
    }
}
