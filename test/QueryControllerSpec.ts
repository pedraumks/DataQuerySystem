/**
 * Created by rtholmes on 2016-10-31.
 */

import {Datasets, default as DatasetController} from "../src/controller/DatasetController";
import QueryController from "../src/controller/QueryController";
import {QueryRequest} from "../src/controller/QueryController";
import Log from "../src/Util";

import {expect} from 'chai';

import path = require('path');
import fs = require('fs');

describe("QueryController", function () {

    beforeEach(function () {
    });

    afterEach(function () {
    });

    it("Should be able to validate a valid query", function () {
        // NOTE: this is not actually a valid query for D1
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {"GT": {"courses_avg": 90}},
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let isValid = controller.isValid(query);

        expect(isValid).to.equal(true);
    });

    it("Should be able to invalidate an invalid query", function () {
        let query: any = null;
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let isValid = controller.isValid(query);

        expect(isValid).to.equal(false);
    });

    it("Should be able to query, although the answer will be empty", function () {
        // NOTE: this is not actually a valid query for D1, nor is the result correct.
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {"GT": {"courses_avg": 200}},
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };
        let dataset: Datasets = {};
        let controller = new QueryController(dataset);
        let ret = controller.query(query);
        Log.test('In: ' + JSON.stringify(query) + ', out: ' + JSON.stringify(ret));
        expect(ret).not.to.be.equal(null);
        // should check that the value is meaningful
    });

    it("Should be able to process a simple query", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {"GT": {"courses_avg": 96}},
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };
        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_one = controller.query(query);
        console.log(response_one);
        let file: string = "response1.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        //console.log(response_one['result']);
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_one);
        // should check that thcontente value is meaningful
    });

    it("Should be able to process a complex query", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "courses_avg"],
            "WHERE": {
            "OR": [
                {"AND": [
                    {"GT": {"courses_avg": 85}},
                    {"IS": {"courses_dept": "adhe"}}
                ]},
                {"EQ": {"courses_avg": 95}}
            ]
        },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_two = controller.query(query);
        console.log(response_two);
        let file: string = "response2.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        //console.log(response_two['result']);
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_two);
        // should check that the value is meaningful
    });

    /**
    it("Should be able to process a query with the NOT token", function () {
        this.timeout(10000);
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {
                "NOT":
                    {"LT": {"courses_avg": 97}}
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_three = controller.query(query);
        console.log(response_three);
        let file: string = "response3.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        //console.log(response_three['result']);
        expect(response_three).to.deep.equal(content);
        // should check that the value is meaningful
    });*/

    it("Should be able to process a query where the response is sorted strings", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {"GT": {"courses_avg": 96}},
            "ORDER": "courses_dept",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_four = controller.query(query);
        console.log(response_four);
        let file: string = "response4.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        //console.log(response_four['result']);
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_four);
        // should check that the value is meaningful
    });

    it("Should be able to process a query with multiple ANDs", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "courses_avg"],
            "WHERE": {
                "AND": [
                    {"AND": [
                        {"IS": {"courses_id": "310"}},
                        {"IS": {"courses_dept": "cpsc"}}
                    ]},
                    {"GT": {"courses_avg": 75}}
                ]
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_five = controller.query(query);
        console.log(response_five);
        let file: string = "response5.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        //console.log(response_five['result']);
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_five);
        // should check that the value is meaningful
    });

    it("Should be able to process a query with multiple ORs", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg", "courses_fail"],
            "WHERE": {
                "OR": [
                    {"OR": [
                        {"EQ": {"courses_avg": 50}},
                        {"EQ": {"courses_avg": 60}}
                    ]},
                    {"LT": {"courses_avg": 50}}
                ]
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_six = controller.query(query);
        console.log(response_six);
        let file: string = "response6.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        //console.log(response_six['result']);
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_six);
        // should check that the value is meaningful
    });

    it("Should be able to find an invalid query piece (error code: 400) in a query", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg", "courses_fail"],
            "WHERE": {
                "GET": [
                    {"OR": [
                        {"EQ": {"courses_avg": 50}},
                        {"EQ": {"courses_avg": 60}}
                    ]},
                    {"LT": {"courses_avg": 50}}
                ]
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response = controller.query(query);
        let statusCode = controller.getStatusCode();
        expect(statusCode).to.deep.equal(400);
        // should check that the value is meaningful
    });

    it("Should be able to find the missing id in GET (error code: 424)", function () {
        let query: QueryRequest = {
            "GET": ["course_dept", "course_avg", "course_fail"],
            "WHERE": {
                "OR": [
                    {"OR": [
                        {"EQ": {"course_avg": 50}},
                        {"EQ": {"course_avg": 60}}
                    ]},
                    {"LT": {"course_avg": 50}}
                ]
            },
            "ORDER": "course_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response = controller.query(query);
        let statusCode = controller.getStatusCode();
        let missing = controller.getMissingIds();
        let message = controller.getStatusMessage();
        //console.log(response);
        expect(statusCode).to.deep.equal(424);
        // should check that the value is meaningful
    });

    it("Should not be able to add duplicates", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {
                "OR": [
                    {"LT": {"courses_avg": 50}},
                    {"LT": {"courses_avg": 50}}
                ]
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response = controller.query(query);
        //console.log(response);
        expect(response).to.deep.equal({"render":"TABLE","result":[{"courses_dept":"lfs","courses_avg":0},{"courses_dept":"lfs","courses_avg":0},{"courses_dept":"wood","courses_avg":1},{"courses_dept":"fopr","courses_avg":4.5},{"courses_dept":"civl","courses_avg":33},{"courses_dept":"hist","courses_avg":34},{"courses_dept":"chbe","courses_avg":42},{"courses_dept":"busi","courses_avg":42.64},{"courses_dept":"busi","courses_avg":42.64},{"courses_dept":"chbe","courses_avg":44.88},{"courses_dept":"hist","courses_avg":46.33},{"courses_dept":"hist","courses_avg":46.33},{"courses_dept":"frst","courses_avg":46.59},{"courses_dept":"comm","courses_avg":46.71},{"courses_dept":"busi","courses_avg":46.95},{"courses_dept":"hist","courses_avg":47.13},{"courses_dept":"lled","courses_avg":48.9},{"courses_dept":"comm","courses_avg":49.07},{"courses_dept":"hist","courses_avg":49.15},{"courses_dept":"busi","courses_avg":49.17},{"courses_dept":"civl","courses_avg":49.25},{"courses_dept":"busi","courses_avg":49.47},{"courses_dept":"busi","courses_avg":49.47},{"courses_dept":"lled","courses_avg":49.73},{"courses_dept":"lled","courses_avg":49.86}]});
        // should check that the value is meaningful
    });

    it("Should be able to invalidate string when number is expected (error code: 400)", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg", "courses_fail"],
            "WHERE": {
                "OR": [
                    {"OR": [
                        {"EQ": {"courses_avg": "fifty"}},
                        {"EQ": {"courses_avg": "sixty"}}
                    ]},
                    {"LT": {"courses_avg": "50"}}
                ]
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response = controller.query(query);
        let statusCode = controller.getStatusCode();
        //console.log(response);
        expect(statusCode).to.deep.equal(400);
        // should check that the value is meaningful
    });

    it("Should be able to invalidate number when string is expected (error code: 400)", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "courses_avg"],
            "WHERE": {
                "AND": [
                    {"AND": [
                        {"IS": {"courses_id": 310}},
                        {"IS": {"courses_dept": "cpsc"}}
                    ]},
                    {"GT": {"courses_avg": 75}}
                ]
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response = controller.query(query);
        let statusCode = controller.getStatusCode();
        //console.log(response);
        expect(statusCode).to.deep.equal(400);
        // should check that the value is meaningful
    });

    it("Should be able to find invalid field identifier (error code: 400)", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg", "courses_fail"],
            "WHERE": {
                "OR": [
                    {"OR": [
                        {"EQ": {"courses_average": 50}},
                        {"EQ": {"courses_average": 60}}
                    ]},
                    {"LT": {"courses_avg": 50}}
                ]
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_ten = controller.query(query);
        let statusCode = controller.getStatusCode();
        console.log(response_ten);
        let file: string = "response10.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        //console.log(response_ten['result']);
        expect(statusCode).to.deep.equal(400);
        // should check that the value is meaningful
    });

    it("Should be able to find the missing id in WHERE (error code: 400)", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg", "courses_fail"],
            "WHERE": {
                "OR": [
                    {"OR": [
                        {"EQ": {"course_avg": 50}},
                        {"EQ": {"course_avg": 60}}
                    ]},
                    {"LT": {"course_avg": 50}}
                ]
            },
            "ORDER": "courses_avg",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response = controller.query(query);
        let statusCode = controller.getStatusCode();
        //console.log(response);
        expect(statusCode).to.deep.equal(400);
        // should check that the value is meaningful
    });
    // Currently fails due to commented out code in QueryController
    it("Should be not be able to process query because ORDER is not present in GET", function () {
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_avg"],
            "WHERE": {
                "OR": [
                    {"OR": [
                        {"EQ": {"courses_avg": 50}},
                        {"EQ": {"courses_avg": 60}}
                    ]},
                    {"LT": {"courses_avg": 50}}
                ]
            },
            "ORDER": "courses_fail",
            "AS": "TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response = controller.isValid(query);
        //console.log(response);
        expect(response).to.equal(false);
        // should check that the value is meaningful
    });

    it("Should be able to get averages of all courses in a department", function () {
        let query: QueryRequest = {
            "GET": ["courses_id", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}} ,
            "GROUP": [ "courses_id" ],
            "APPLY": [ {"courseAverage": {"AVG": "courses_avg"}} ],
            "ORDER": { "dir": "UP", "keys": ["courseAverage", "courses_id"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_seven = controller.query(query);
        console.log(response_seven);
        let file: string = "response7.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        //console.log(response_seven['result']);
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_seven);
        // should check that the value is meaningful
    });

    /**
    it("Should pass more complex GROUP/APPLY", function () {
        this.timeout(20000);
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "courseAverage", "maxFail"],
            "WHERE": {},
            "GROUP": [ "courses_dept", "courses_id" ],
            "APPLY": [ {"courseAverage": {"AVG": "courses_avg"}}, {"maxFail": {"MAX": "courses_fail"}} ],
            "ORDER": { "dir": "UP", "keys": ["courseAverage", "maxFail", "courses_dept", "courses_id"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_eight = controller.query(query);
        console.log(response_eight);
        let file: string = "response8.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        //console.log(response_eight['result']);
        expect(response_eight).to.deep.equal(content);
        // should check that the value is meaningful
    });

    it("Should pass more complex GROUP/APPLY #2", function () {
        this.timeout(20000);
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "numSections"],
            "WHERE": {},
            "GROUP": [ "courses_dept", "courses_id" ],
            "APPLY": [ {"numSections": {"COUNT": "courses_uuid"}} ],
            "ORDER": { "dir": "UP", "keys": ["numSections", "courses_dept", "courses_id"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_nine = controller.query(query);
        console.log(response_nine);
        let file: string = "response9.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        //console.log(response_nine['result']);
        expect(response_nine).to.deep.equal(content);
        // should check that the value is meaningful
    });*/

    it("Should not be able to process query because APPLY is undefined", function () {
        this.timeout(20000);
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "numSections"],
            "WHERE": {},
            "GROUP": [ "courses_dept", "courses_id" ],
            "APPLY": [ "" ],
            "ORDER": { "dir": "UP", "keys": ["numSections", "courses_dept", "courses_id"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        controller.isValid(query);
        let statusCode = controller.getStatusCode();
        expect(statusCode).to.deep.equal(400);
    });

    it("Should not be able to process query because APPLY is missing", function () {
        this.timeout(20000);
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "numSections"],
            "WHERE": {},
            "GROUP": [ "courses_dept", "courses_id" ],
            "ORDER": { "dir": "UP", "keys": ["numSections", "courses_dept", "courses_id"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        controller.isValid(query);
        let statusCode = controller.getStatusCode();
        expect(statusCode).to.deep.equal(400);
    });

    it("Should not be able to process query because GROUP cannot be empty", function () {
        this.timeout(20000);
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "numSections"],
            "WHERE": {},
            "GROUP": [  ],
            "APPLY": [ {"numSections": {"COUNT": "courses_uuid"}} ],
            "ORDER": { "dir": "UP", "keys": ["numSections", "courses_dept", "courses_id"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        controller.isValid(query);
        let statusCode = controller.getStatusCode();
        expect(statusCode).to.deep.equal(400);
    });

    it("Should not be able to process query because all keys in group must be present in GET", function () {
        this.timeout(20000);
        let query: QueryRequest = {
            "GET": ["courses_dept", "numSections"],
            "WHERE": {},
            "GROUP": [ "courses_dept", "courses_id" ],
            "APPLY": [ {"numSections": {"COUNT": "courses_uuid"}} ],
            "ORDER": { "dir": "UP", "keys": ["numSections", "courses_dept", "courses_id"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        expect(controller.isValid(query)).to.deep.equal(false);
    });

    it("Should not be able to process query because there is an invalid key in GROUP", function () {
        this.timeout(20000);
        let query: QueryRequest = {
            "GET": ["courses_dept", "courses_id", "numSections"],
            "WHERE": {},
            "GROUP": [ "courses_dept", "courses_id", "numSections" ],
            "APPLY": [ {"numSections": {"COUNT": "courses_uuid"}} ],
            "ORDER": { "dir": "UP", "keys": ["numSections", "courses_dept", "courses_id"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        controller.isValid(query);
        let statusCode = controller.getStatusCode();
        expect(statusCode).to.deep.equal(400);
    });

    it("Should not be able to process a query with multiple datasets", function () {
        this.timeout(20000);
        let query: QueryRequest = {
            "GET": ["courses_dept", "rooms_number", "numSections"],
            "WHERE": {},
            "GROUP": [ "courses_dept", "rooms_number" ],
            "APPLY": [ {"numSections": {"COUNT": "courses_uuid"}} ],
            "ORDER": { "dir": "UP", "keys": ["numSections", "courses_dept", "rooms_number"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        controller.isValid(query);
        let statusCode = controller.getStatusCode();
        expect(statusCode).to.deep.equal(400);
    });

    it("Should be able to get the maximum number of fails in cpsc department courses", function () {
        let query: QueryRequest = {
            "GET": ["courses_id", "maxFail"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}} ,
            "GROUP": [ "courses_id" ],
            "APPLY": [ {"maxFail": {"MAX": "courses_fail"}} ],
            "ORDER": { "dir": "UP", "keys": ["maxFail", "courses_fail"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_eleven = controller.query(query);
        console.log(response_eleven);
        let file: string = "response11.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_eleven);
        // should check that the value is meaningful
    });

    it("Should be able to get the number of sections offered for each cpsc course", function () {
        let query: QueryRequest = {
            "GET": ["courses_id", "numSections"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}},
            "GROUP": [ "courses_id" ],
            "APPLY": [ {"numSections": {"COUNT": "courses_uuid"}} ],
            "ORDER": { "dir": "UP", "keys": ["numSections", "courses_uuid"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_twelve = controller.query(query);
        console.log(response_twelve);
        let file: string = "response12.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_twelve);
        // should check that the value is meaningful
    });

    it("Should be able to get the minimum number of passes in cpsc department courses", function () {
        let query: QueryRequest = {
            "GET": ["courses_id", "minPass"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}} ,
            "GROUP": [ "courses_id" ],
            "APPLY": [ {"minPass": {"MIN": "courses_pass"}} ],
            "ORDER": { "dir": "UP", "keys": ["minPass", "courses_pass"]},
            "AS":"TABLE"
        };

        let dataset: Datasets = {'courses': JSON.parse(fs.readFileSync('./data/courses.json').toString())};
        let controller = new QueryController(dataset);
        let response_thirteen = controller.query(query);
        console.log(response_thirteen);
        let file: string = "response13.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_thirteen);
        // should check that the value is meaningful
    });

    it("Should be able to find the rooms in the DMP building", function () {
        let query: QueryRequest = {
            "GET": ["rooms_fullname", "rooms_number"],
            "WHERE": {"IS": {"rooms_shortname": "DMP"}},
            "ORDER": { "dir": "UP", "keys": ["rooms_number"]},
            "AS": "TABLE"
        };

        let dataset: Datasets = {'rooms': JSON.parse(fs.readFileSync('./data/rooms.json').toString())};
        let controller = new QueryController(dataset);
        let response_fourteen = controller.query(query);
        console.log(response_fourteen);
        let file: string = "response14.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_fourteen);
        // should check that the value is meaningful
    });

    it("Should be able to list rooms with moveable tables in a bounding box", function () {
        let query: QueryRequest = {
            "GET": ["rooms_fullname", "rooms_number", "rooms_seats"],
            "WHERE": {"AND": [
                {"GT": {"rooms_lat": 49.261292}},
                {"LT": {"rooms_lon": -123.245214}},
                {"LT": {"rooms_lat": 49.262966}},
                {"GT": {"rooms_lon": -123.249886}},
                {"IS": {"rooms_furniture": "*Movable Tables*"}}
            ]},
            "ORDER": { "dir": "UP", "keys": ["rooms_number"]},
            "AS": "TABLE"
        };

        let dataset: Datasets = {'rooms': JSON.parse(fs.readFileSync('./data/rooms.json').toString())};
        let controller = new QueryController(dataset);
        let response_sixteen = controller.query(query);
        console.log(response_sixteen);
        let file: string = "response16.json";
        let fullpath: string = path.join('./test/', file);
        let content: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            content = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        expect(200).to.deep.equal(controller.getStatusCode());
        expect(content).to.deep.equal(response_sixteen);
        // should check that the value is meaningful
    });

});