/**
 * Created by Lucas on 10/20/2016.
 */
import {Datasets} from "./DatasetController";
import Log from "../Util";
import {QueryRequest} from "./QueryController";

export interface GroupRequest {
    GET: string|string[];
    GROUP: string[];
    APPLY: Object[];
}

export default class GroupController {
    private dataset: Array<Object> = null;
    private group: Array<string> = null;
    private apply: Array<Object> = null;
    private results: Array<Object> = [];

    /**
     * Basic constructor for GroupController
     * @param data Array of objects returned from parsing WHERE
     */
    constructor(data: Array<Object>) {
        this.dataset = data;
    }

    /**
     * Main point of entry to parse a group and apply section of a query
     * @param query The GET, GROUP, and APPLY portions of the query
     */
    public groupAndApply(groupItems: Array<string>, applyItems: Array<Object>): Array<Object> {
        Log.trace('GroupController::groupAndApply');
        this.group = groupItems;
        this.apply = applyItems;
        this.makeGroupsAndGetData();
        this.calculateResults();
        return this.results;
    }

    /**
     * Iterates through the dataset, creating groups and collecting data for each group
     */
    private makeGroupsAndGetData(): void {
        Log.trace('GroupController::makeGroupAndGetData');
        // For each item in the dataset
        for (var i = 0; i < this.dataset.length; i++) {
            var pairing: Object = {};
            // For each group key
            for (var j = 0; j < this.group.length; j++) {
                (<any>pairing)[this.group[j]] = (<any>this.dataset[i])[(<any>this.group)[j]];
            }
            let alreadyGrouped: boolean = false;
            for (var k = 0; k < this.results.length; k++) {
                if (this.sameGroup(pairing, this.results[k])) {
                    this.addData(this.results[k], this.dataset[i]);
                    alreadyGrouped = true;
                }
            }
            if(!alreadyGrouped) {
                this.addDataFields(pairing);
                this.addData(pairing, this.dataset[i]);
                this.results.push(pairing);
            }
        }
    }

    /**
     * Checks if two objects should be grouped together
     * NOTE: Ordering here is important, the new object with no data fields must come first
     * @param newGroup The object that has just been assembled with group keys
     * @param existingGroup The object that has been grouped, may or may not have data properties
     * @returns {boolean}
     */
    private sameGroup(newGroup: Object, existingGroup: Object): boolean {
        var same: boolean = true;
        // For each key in the new group object
        for (var key of Object.keys(newGroup)) {
            if (!((<any>newGroup)[key] === (<any>existingGroup)[key])) {
                same = false;
            }
        }
        return same;
    }

    /**
     * Adds data fields (e.g. courseAverage) for each apply key to a grouped object
     * @param obj
     */
    private addDataFields(obj: Object): void {
        for (var i = 0; i < this.apply.length; i++) {
            let id: string = Object.keys(this.apply[i])[0]; // eg MaxFail
            (<any>obj)[id] = []; // add an e.g. MaxFail attribute to the group. This will be replaced with a number later
        }
    }

    /**
     * Takes an item from the dataset and adds any relevant data to the grouping
     * @param grouping a grouping with fields to add data to
     * @param data an object from the full dataset
     */
    private addData(grouping: Object, data: Object): void {
        for (var i = 0; i < this.apply.length; i++) {
            let id: string = Object.keys(this.apply[i])[0]; // eg MaxFail
            (<any>grouping)[id].push((<any>data)[id]); // Add the piece needed value from data to pairing's array
        }
    }

    /**
     * Goes through all the groupings once they have all their data and performs the requested calculation
     */
    private calculateResults(): void {
        // For each grouping in the result
        for(var i = 0; i < this.results.length; i++) {
            // For each APPLY rule
            for(var j = 0; j < this.apply.length; j++) {
                let id: string = Object.keys(this.apply[j])[0]; // eg MaxFail
                let op: string = Object.keys((<any>this.apply[j])[id])[0]; // eg MAX
                let result = 0;
                let data = (<any>this.results[i])[id]; // The array of data for the APPLY rule
                if(op === 'MAX') {
                    result = data[0];
                    for(var k = 0; k < data.length; k++) {
                        if(result < data[k]) {
                            result = data[k];
                        }
                    }
                } else if(op === 'MIN') {
                    result = data[0];
                    for(var k = 0; k < data.length; k++) {
                        if(result > data[k]) {
                            result = data[k];
                        }
                    }
                } else if(op === 'AVG') {
                    for(var k = 0; k < data.length; k++) {
                        result += data[k];
                    }
                    result /= data.length;
                    result = Number(result.toFixed(2)); // Rounding
                } else if(op === 'COUNT') {
                    // Go through all items, add uniques to an array, take the length of the unique array
                    let unique: Array<any> = [];
                    for (var k = 0; k < data.length; k++) {
                        if(unique.indexOf(data[k]) === -1) {
                            unique.push(data[k]);
                        }
                    }
                    result = unique.length;
                } else if(op === 'SIZE') { // Evil hardcoding incoming
                    let totals: Array<any> = [];
                    for (var k = 0; k < data.length; k++) {
                        totals.push((<any>this.results[i])['maxSize'][k] + (<any>this.results[i])['maxFail'][k])
                    }
                    for(var l = 0; l < data.length; l++) {
                        if(result < totals[l]) {
                            result = totals[l];
                        }
                    }
                }
                (<any>this.results[i])[id] = result;
            }
        }
    }
}