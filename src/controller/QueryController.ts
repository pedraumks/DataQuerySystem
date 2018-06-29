/**
 * Created by rtholmes on 2016-06-19.
 */

import {Datasets} from "./DatasetController";
import {GroupRequest, default as GroupController} from "./GroupController";
import Log from "../Util";

export interface QueryRequest {
    GET: string[];
    WHERE: {};
    GROUP?: string[];
    APPLY?: Object[];
    ORDER: string|Object;
    AS: string;
}

export interface QueryOrder {
    dir: string;
    keys: Array<string>;
}

export interface QueryResponse {
    render: string;
    result: Array<Object>;
}

export default class QueryController {
    private datasets: Datasets = null;

    private queryGet: Array<string> = null; // e.g. ["courses_dept", "courses_avg"]
    private queryGetKeys: Array<string> = null;
    private queryWhere: Object = null;      // Main query content
    private queryOrder: string|Object = null;
    private queryAs: string = null;
    private queryGroup: Array<string> = null;
    private queryApply: Array<Object> = null;

    private queryApplyGet: Array<string> = []; // The keys that need to be used to calculate apply values
    private queryApplyGetKeys: Array<string> = []; // The form they appear in in the data
    private queryAllGet: Array<string> = [];
    private queryAllGetKeys: Array<string> = [];

    private statusCode: number = 200; // Assume fail, sets to
    private statusMessage: string = 'Something went wrong';
    private missingIds: Array<string> = [];

    private datasetType: string = ''; // courses or rooms

    private givenKeyToDataKey: Object = {
        'courses_audit': 'Audit',           // Number (int)
        'courses_avg': 'Avg',               // Number (float)
        'courses_dept': 'Subject',          // String
        'courses_fail': 'Fail',             // Number (int)
        'courses_id': 'Course',             // String
        'courses_instructor': 'Professor',  // String
        'courses_pass': 'Pass',             // Number (int)
        'courses_title': 'Title',           // String
        'courses_uuid': 'id',               // String
        'courses_year': 'Year',
        'courses_section': 'Section',
        'courses_size': 'Size', // Special case
        'rooms_fullname': 'rooms_fullname',
        'rooms_shortname': 'rooms_shortname',
        'rooms_number': 'rooms_number',
        'rooms_name': 'rooms_name',
        'rooms_address': 'rooms_address',
        'rooms_lat': 'rooms_lat',
        'rooms_lon': 'rooms_lon',
        'rooms_seats': 'rooms_seats',
        'rooms_type': 'rooms_type',
        'rooms_furniture': 'rooms_furniture',
        'rooms_href': 'rooms_href'
    };

    constructor(datasets: Datasets) {
        this.datasets = datasets;
    }

    public getStatusCode(): number {
        return this.statusCode;
    }

    public getStatusMessage(): string {
        return this.statusMessage;
    }

    public getMissingIds(): Array<string> {
        return this.missingIds;
    }

    /**
     * Checks if basic query structure is correct
     * @param query Query to check
     * @returns {boolean} If basic query structure is correct
     */
    public isValid(query: QueryRequest): boolean {
        Log.trace('QueryController::isValid');
        if (
            typeof query === 'undefined' ||
            query === null ||
            Object.keys(query).length < 1 ||
            typeof query.GET === 'undefined' ||
            typeof query.WHERE === 'undefined' ||
            typeof query.AS === 'undefined'
        ) {
            this.statusMessage = "Invalid query, please ensure required keys are provided and spelled correctly";
            return false;
        }

         if (typeof query.ORDER !== 'undefined') {
             if (typeof query.ORDER === 'string') {
                 if (query.GET.indexOf(<string>(query.ORDER)) === -1) {
                     this.statusMessage = "Invalid query, ORDER must be present in GET";
                     return false;
                 }
             } else {
                 let orders = (<QueryOrder>query.ORDER).keys;
                 for (var i = 0; i < orders.length; i++) {
                     if (query.GET.indexOf(orders[i]) === -1) {
                         this.statusMessage = "Invalid query, all ORDER keys must be present in GET";
                         return false;
                     }
                 }
             }
         }
        // GROUP or APPLY can't exist without the other
        if ((typeof query.GROUP !== 'undefined' && typeof query.APPLY === 'undefined')
            || (typeof query.GROUP === 'undefined' && typeof query.APPLY !== 'undefined')) {
            this.statusMessage = "Invalid query, GROUP and APPLY must always appear together";
            this.statusCode = 400;
            return false;
        }
        if (typeof query.GROUP !== 'undefined') { // If group (and also apply) exists
            // Shouldn't be empty
            if(query.GROUP.length < 1) {
                this.statusMessage = "Invalid query, if GROUP is present it cannot be empty";
                this.statusCode = 400;
                return false;
            }
            // All group keys must be present in get, contain _
            for(var i = 0; i < query.GROUP.length; i++) {
                // If there is a get key not in
                if(query.GET.indexOf(query.GROUP[i]) === -1) {
                    this.statusMessage = "Invalid query, all keys in GROUP must be in GET";
                    this.statusCode = 400;
                    return false;
                }
                if(query.GROUP[i].indexOf('_') === -1) {
                    this.statusMessage = "Invalid query, invalid key in GROUP";
                    this.statusCode = 400;
                    return false;
                }
            }

            // All keys in get must be in group or apply
            for(var i = 0; i < query.GET.length; i++) {
                let existsElsewhere: boolean = false;
                // Check if it exists in GROUP
                for(var j = 0; j < query.GROUP.length; j++) {
                    if(query.GET[i] == query.GROUP[j]) {
                        existsElsewhere = true;
                        break;
                    }
                }
                // Check if it exists in APPLY
                for(var j = 0; j < query.APPLY.length; j++) {
                    let outerKey: string = Object.keys(query.APPLY[j])[0];
                    if(query.GET[i] == outerKey) {
                        existsElsewhere = true;
                        break;
                    }
                }
                if (existsElsewhere == false) {
                    this.statusMessage = "All keys in get must be in either GROUP or APPLY";
                    this.statusCode = 400;
                    return false;
                }
            }
        }
        // Can't have multiple datasets required
        this.datasetType = query.GET[0].split('_')[0];
        for(var i = 0; i < query.GET.length; i++) {
            // If it has an _ (isn't from APPLY) but doesn't match prefixes
            if(query.GET[i].indexOf('_') !== -1 && query.GET[i].split('_')[0] !== this.datasetType) {
                console.log('first');
                this.statusMessage = "Multiple datasets are not supported";
                this.statusCode = 400;
                return false;
            }
        }
        return true;
    }

    /**
     * Checks if this query has a group component passed
     * @returns {boolean}
     */
    private usesGroup() {
        return this.queryGroup !== null;
    }

    /**
     * Checks if for each datapiece we need to return, we have the dataset it comes from
     * e.g. dataset named courses for courses_avg
     * @returns {boolean}
     */
    private haveRequiredDatasets(): boolean {
        let ok: boolean = true;
        for (var j = 0; j < this.queryGet.length; j++) {
            if (!this.isApplyKey(this.queryGet[j])) { // If it's not an apply key
                let key: string = this.queryGet[j].split('_')[0]; // First part of e.g. courses_avg
                // If we don't have a dataset for the key, and we haven't already added it to missing id list
                if (!this.haveRequiredDataset(key)) {
                    if (this.missingIds.indexOf(key) < 0) {
                        this.missingIds.push(this.queryGet[j].split('_')[0]); // Add to missing id list
                        ok = false;
                        this.statusCode = 424;
                        this.statusMessage = 'Missing IDs';
                    }
                }
            }
        }
        return ok;
    }

    /**
     * Checks if a dataset is loaded.
     * @param key Key from the beginning of a field identifier, like "courses" from "courses_id"
     * @returns {boolean}
     */
    private haveRequiredDataset(key: string): boolean {
        return typeof this.datasets[key] !== 'undefined';
    }

    /**
     * Saves main pieces of query, cheks for datasets, initiates query process
     * @param query user given query
     * @returns {any} Dataset with result and render
     */
    public query(query: QueryRequest): QueryResponse {
        Log.trace('QueryController::query( ' + JSON.stringify(query) + ' )');
        this.queryGet = query.GET;
        this.queryWhere = query.WHERE;
        this.queryOrder = query.ORDER;
        this.queryAs = query.AS;
        if (typeof query.GROUP !== 'undefined') { // If it's a group/apply query, set stuff, otherwise leave null
            this.queryGroup = query.GROUP;
            this.queryApply = query.APPLY;
        }
        // Checks for missing datasets, sets error code and message
        if (!this.haveRequiredDatasets()) {
            return {render: this.queryAs, result: []};
        }
        // If isValid wasn't called first this is necessary to check the WHERE clauses
        if (this.datasetType == ''){
            console.log('second');
            this.datasetType = query.GET[0].split('_')[0];
        }
        // Set all the attributes to get to the form they have in the data
        var dataGets: Array<string> = [];
        for (var i = 0; i < query.GET.length; i++) {
            if(!this.isApplyKey(query.GET[i])){ // If it's not a personally defined APPLY key
                dataGets.push((<any>this.givenKeyToDataKey)[query.GET[i]]);
            }
        }
        this.queryGetKeys = dataGets;

        // Find all the keys that APPLY will use so we can get them when running WHERE
        if (this.usesGroup()) {
            this.setApplyGets();
        }

        // Combine the gets and applys, and combine the forms they appear in in the data
        this.queryAllGet = this.queryGet.concat(this.queryApplyGet);
        this.queryAllGetKeys = this.queryGetKeys.concat(this.queryApplyGetKeys);
        return this.processQueryMaster();
    }

    /**
     * Finds the values to do calculations on, and their associated forms in the data
     */
    private setApplyGets(): void {
        let applyGets: Array<string> = [];
        let applyGetKeys: Array<string> = [];
        // Find the fields needed to get data from the files
        for(var i = 0; i < this.queryApply.length; i++) {
            let outerKey: string = Object.keys(this.queryApply[i])[0]; // e.g. coursesAverage
            let innerKey: string = Object.keys((<any>this.queryApply[i])[outerKey])[0]; // e.g. AVG
            let value: string = <any>((<any>this.queryApply[i])[outerKey])[innerKey]; // e.g. courses_avg
            applyGets.push(value);
            applyGetKeys.push((<any>this.givenKeyToDataKey)[value]);
        }
        this.queryApplyGet = applyGets;
        this.queryApplyGetKeys = applyGetKeys;
    }

    /**
     * Initial entry point for recursive query processing, creates and returns a QueryResponse
     * @returns {QueryResponse}
     */
    private processQueryMaster(): QueryResponse {
        Log.trace('QueryController::processQueryMaster');
        let response: QueryResponse = {
            render: this.queryAs,       // This will stay the same
            result: [],                 // This should get updated to the final result
        };
        // If where is empty, get everything, otherwise normal process
        if(Object.keys(this.queryWhere).length < 1) {
            var resultUnsorted = this.returnAll();
        } else {
            var resultUnsorted = this.processQueryPiece(this.queryWhere);
        }
        // Strip ID tags out
        this.stripIds(resultUnsorted);
        // If it's a group query, pass it off to the group controller
        if (this.usesGroup()) {
            let groupController: GroupController = new GroupController(resultUnsorted);
            resultUnsorted = groupController.groupAndApply(this.queryGroup, this.queryApply);
        }
        // If it wants an order
        if (typeof this.queryOrder !== 'undefined' && this.queryOrder !== null) {
            response.result = this.sortResult(resultUnsorted);
            //response.result = this.sortSimple(resultUnsorted);
        } else {
            response.result = resultUnsorted;
        }
        Log.trace('QueryController::processQueryMaster - Finished');
        return response;
    }

    /**
     * Sorts results of query from lowest to highest based on ORDER from query
     * @param unsorted unsorted results
     * @returns {any} sorted version of the QueryResponse
     */
     private sortResult(unsorted: any): any {
         // If it's a D1 order, else it's a D2 order
         if (typeof this.queryOrder === 'string') {
            return this.sortSimple(unsorted);
         } else {
            let orders = (<QueryOrder>this.queryOrder).keys;
            let dir: number = 1;
             // If it spesified down, flip the ordering
            if ((<QueryOrder>this.queryOrder).dir === 'DOWN') {
                dir = -1;
            }
            return this.sortComplex(unsorted, orders, dir);
         }
     }

    /**
     * D2 sorting
     * @param unsorted the unsorted complete results
     * @param orders the array of keys to order by
     * @param dir the direction to sort, 1 for ascending (standard), -1 for descending
     * @returns sorted array of objects
     */
     private sortComplex(unsorted: any, orders: Array<string>, dir: number): any {
         console.log('Using complex sorting');
         let sorted = unsorted.slice(0); // Shallow copy
         sorted.sort(function(a:any,b:any) {
             // Check for inequality on keys in order
             for(var i = 0; i < orders.length; i++) {
                 if (a[orders[i]] > b[orders[i]]) {
                    return 1*dir;
                 }
                 else if (a[orders[i]] < b[orders[i]]) {
                    return -1*dir;
                 }
             }
             return 0;
         });
         return sorted;
     }

    /**
     * D1 sorting. Gets ORDER key from member variables
     * @param unsorted the unsorted complete results
     * @returns sorted array of objects
     */
    private sortSimple(unsorted: any): any {
        console.log('Using simple sorting');
        let that = this;
        let sorted = unsorted.slice(0);
        let order: string = <string>that.queryOrder;
        sorted.sort(function(a:any,b:any) {
            if (a[order] > b[order]) {
                return 1;
            }
            else if (a[order] < b[order]) {
                return -1;
            }
            else
                return 0;
        });
        return sorted;
    }

    /**
     * Takes any sub-object of the WHERE section of query, and sends it to an appropriate handler
     * Likely to end up being recursive
     * @param queryPiece an object in the form of a WHERE body
     * @returns {Array<Object>} A list of objects of the requested data
     */
    private processQueryPiece(queryPiece: any): Array<Object> {
        let result: Array<Object> = [];
        let comparator: string = Object.keys(queryPiece)[0]; // First key, which is only key
        Log.trace('QueryController::processQueryPiece - ' + comparator);
        if (comparator === 'AND') { // Can refactor to switch when feeling adventurous
            result = this.evalAnd(queryPiece);
        } else if (comparator === 'OR') {
            result = this.evalOr(queryPiece);
        } else if (comparator === 'GT' || comparator == 'EQ' || comparator === 'LT' || comparator == 'IS') {
            result = this.evalBaseCase(queryPiece);
        } else  if (comparator === 'NOT') {
            result = this.not(this.processQueryPiece(queryPiece['NOT'])); // Call not, pass results of the content of not
        } else {
            this.statusCode = 400;
            this.statusMessage = "Invalid key: " + comparator;
        }
        return result;
    }

    /**
     * Gets a full dataset, takes a second, returns everything in full not in the second
     * @param arr dataset returned by NOT body
     * @returns {Array<Object>}
     */
    private not(arr: Array<any>): Array<Object> {
        let fullArr: Array<Object> = this.returnAll();
        let returnArray: Array<Object> = [];
        for (var i = 0; i < fullArr.length; i++) {
            if (!this.inBothSets(fullArr[i], arr)) {
                returnArray.push(fullArr[i]);
            }
        }
        return returnArray;
    }

    /**
     * Shortcut to call EvalBaseCase to return all results without errors
     * @returns {Array<Object>}
     */
    private returnAll(): Array<Object> {
        if(this.datasetType == 'courses')
            return this.evalBaseCase({'ALL': {'courses_dept': 'spare'}});
        if(this.datasetType == 'rooms')
            return this.evalBaseCase({'ALL': {'rooms_name': 'spare'}});
    }

    /**
     * Processes all sub-queries with calls to processQueryPiece, returns intersection of the sets
     * @param queryPiece an object in the form of a WHERE body
     * @returns {Array<Object>} A list of objects of the requested data
     */
    private evalAnd(queryPiece: any): Array<Object> {
        Log.trace('QueryController::evalAnd');
        let allResults: Array<Array<Object>> = [];
        let andComponents: Array<Object> = queryPiece['AND'];
        // Take each of the things to 'and', add the results of each to an array
        for (var i = 0; i < andComponents.length; i++) {
            allResults.push(this.processQueryPiece(andComponents[i]));
        }
        return this.intersect(allResults);
    }

    /**
     * Processes all sub-queries with calls to processQueryPiece, returns union of the sets
     * @param queryPiece an object in the form of a WHERE body
     * @returns {Array<Object>} A list of objects of the requested data
     */
    private evalOr(queryPiece: any) {
        Log.trace('QueryController::evalOr');
        let allResults: Array<Array<Object>> = [];
        let orComponents: Array<Object> = queryPiece['OR'];
        // Take each of the things to 'or', add the results of each to an array
        for (var i = 0; i < orComponents.length; i++) {
            allResults.push(this.processQueryPiece(orComponents[i]));
        }
        return this.union(allResults);
    }

    /**
     * Helper function for evalAnd, finds the intersection (items in all) of a list of sets
     * @param arrays list of sets of results
     * @returns {Array<Object>} Intersection of the sets
     */
    private intersect(arrays: Array<Array<Object>>): Array<Object> {
        Log.trace('QueryController::intersect');
        let intersectedResults: Array<Object> = [];
        let firstArr: Array<Object> = arrays[0];
        let inAll: boolean = true;
        // For item in the first array
        for (var item = 0; item < firstArr.length; item++) {
            inAll = true; // Assume in both
            // For each other array
            for (var arr = 1; arr < arrays.length; arr++) {
                if(!this.inBothSets(firstArr[item], arrays[arr])) {
                    inAll = false;
                    break;
                }
            }
            if (inAll) {
                intersectedResults.push(firstArr[item]);
            }
        }
        return intersectedResults;
    }

    /**
     * Helper function to intersect, checks if an object exists in a list of objects
     * @param item A single object
     * @param arr A list of objects
     * @returns {boolean} Whether or not item is in arr
     */
    private inBothSets(item: any, arr: Array<any>): boolean {
        for (var i = 0; i < arr.length; i++) {
            if (this.areEquavalent(arr[i], item)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Helper function for evalAnd, finds the union (items in any) of a list of sets
     * @param arrays list of sets of results
     * @returns {Array<Object>} Union of the sets
     */
    private union(arrays: Array<Array<Object>>): Array<Object> {
        Log.trace('QueryController::union');
        let unionedResults: Array<Object> = [];
        // For each array
        for (var arr = 0; arr < arrays.length; arr++) {
            // For each item in the array
            for (var obj = 0; obj < arrays[arr].length; obj++) {
                let shouldAdd: boolean = true;
                // For each item in the current results set
                for (var uObj = 0; uObj < unionedResults.length; uObj++) {
                    // Check each key/value to see if this object is already added to the set (i.e. don't add duplicates)
                    if (this.areEquavalent(arrays[arr][obj], unionedResults[uObj])) {
                        shouldAdd = false;
                    }
                }
                if (shouldAdd) {
                    unionedResults.push(arrays[arr][obj]);
                }
            }
        }
        return unionedResults;
    }

    /**
     * Essentially obj1.equals(obj2). All properties and keys must be the same
     * @param obj1
     * @param obj2
     * @returns {boolean}
     */
    private areEquavalent(obj1: any, obj2: any): boolean {
        return obj1['id'] === obj2['id'];
    }

    /**
     * Checks for no underscore indicating it's an apply key
     * @param key
     * @returns {boolean}
     */
    private isApplyKey(key: string) {
        return key.indexOf('_') === -1;
    }

    /**
     * Evaluates the single item query parts for greater than, less than, and equality (EQ and IS).
     * @param comparison Object representing a comparison, essentially a boolean to check, e.g. {"GT": {"courses_avg": 70}}
     * @returns {Array<Object>} All items in the dataset matching the condition
     */
    private evalBaseCase(comparison: Object): Array<Object> {
        let op = Object.keys(comparison)[0];                    // E.g. GT, IS
        Log.trace('QueryController::evalBaseCase - ' + op);
        let prop = Object.keys((<any>comparison)[op])[0];       // E.g. courses_avg
        let ds = prop.split('_')[0];
        let dataset: any = this.datasets[ds];
        let val = (<any>comparison)[op][prop];                  // E.g. 90, "cpsc"
        let returnArray: Array<Object> = [];
        //TODO
        if (!this.haveRequiredDataset(ds)) {
            if (this.missingIds.indexOf(ds) < 0) {
                this.missingIds.push(ds); // Add to missing id list
                this.statusCode = 424;
                this.statusMessage = 'Missing IDs';
                return returnArray;
            }
        }
        //TODO
        // If this base case isn't the dataset we've encountered before
        if (ds !== this.datasetType) {
            console.log(ds);
            console.log(this.datasetType);
            this.statusCode = 400;
            this.statusMessage = "Multiple datasets are not supported";
            return returnArray;
        }
        //TODO
        // Make sure this is a field we know, and the comparison is of the correct type
        if (typeof (<any>this.givenKeyToDataKey)[prop] === 'undefined') {
            this.statusCode = 400;
            this.statusMessage = "Invalid field identifier: " + prop + " for " + JSON.stringify(comparison);
            return returnArray;
        } else if (op === 'IS' && typeof val !== 'string') {
            this.statusCode = 400;
            this.statusMessage = "Can't compare non string with string operator";
            return returnArray;
        } else if ((op === 'GT' || op === 'LT' || op === 'EQ') && typeof val !== 'number') {
            this.statusCode = 400;
            this.statusMessage = "Can't compare non number with numeric operator";
            return returnArray;
        }

        let dataKey: number|string = (<any>this.givenKeyToDataKey)[prop]; // E.g. changes courses_avg to Avg
        let dataId: number = 0;
        /*
         This potentially loops through different datasets, since originally I thought we'd have to do many at once
         Given the format of the dataset file, it's still a fine approach, it just doesn't really need to be a loop
         */
        for (let id of Object.keys(dataset)) {
            let data: Array<Object> = dataset[id]["result"];
            // For each section
            for (var i = 0; i < data.length; i++) {
                // If the section has data on what we're checking, and it meets the criteria
                dataId++;
                if (this.compare(op, data[i], val, dataKey)) { // Match
                    let returnItem = {id: dataId};
                    // Get all the properties about this section requested in GET
                    let hadAllKeys: boolean = true;
                    for (var j = 0; j < this.queryAllGetKeys.length; j++) {
                        // Has a get key
                        if(this.queryAllGetKeys[j] === 'Size') {
                            if (data[i].hasOwnProperty('Pass')) {
                                (<any>returnItem)[this.queryAllGet[j]] = (<any>data[i])['Pass'] + (<any>data[i])['Fail'];
                            }
                        } else {
                            if (data[i].hasOwnProperty(this.queryAllGetKeys[j])) {
                                (<any>returnItem)[this.queryAllGet[j]] = (<any>data[i])[this.queryAllGetKeys[j]];
                            }
                        }
                    }
                    if (hadAllKeys) {
                        returnArray.push(returnItem);
                    }
                }
            }
        }
        return returnArray;
    }

    /**
     * Boolean comparison for evalBaseCase
     * @param op Operator [GT, LT, IS, EQ, ALL (used in NOT)]
     * @param obj The object to check
     * @param val Value to compare to
     * @param key the property to check the value of
     * @returns {boolean} If the object meets the criteria
     */
    private compare(op: string, obj: any, val: any, key: any): boolean {
        if(key === "Size") {
            if (op === 'GT') {
                return obj.hasOwnProperty("Pass") && ((<any>obj)['Pass'] + (<any>obj)['Fail']) > val;
            } else if (op === 'LT') {
                return obj.hasOwnProperty("Pass") && ((<any>obj)['Pass'] + (<any>obj)['Fail']) < val;
            } else if (op === 'EQ') {
                return obj.hasOwnProperty("Pass") && ((<any>obj)['Pass'] + (<any>obj)['Fail']) === val;
            }
        }
        if (op === 'GT') {
            return obj.hasOwnProperty(key) && (<any>obj)[key] > val;
        } else if (op === 'LT') {
            return obj.hasOwnProperty(key) && (<any>obj)[key] < val;
        } else if (op === 'EQ') {
            return obj.hasOwnProperty(key) && (<any>obj)[key] === val;
        } else if (op === 'IS') {
            var regex = new RegExp('^' + val.split('*').join('.*') + '$'); // middle part is like replaceAll
            return obj.hasOwnProperty(key) && regex.test(obj[key]); // If string is in the field to check
        } else if (op === 'ALL') {
            return true; //TODO
        } else {
            this.statusCode = 400;
            this.statusMessage = "Invalid key: " + op;
            return false; //TODO
        }
    }

    /**
     * Cuts out the added IDs used for object identification
     * @param arr
     */
    private stripIds(arr: Array<Object>): void {
        for (var i = 0; i < arr.length; i++) {
            delete (<any>arr[i])['id'];
        }
    }
}