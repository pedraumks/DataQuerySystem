/**
 * Created by rtholmes on 2016-10-04.
 */

import fs = require('fs');
import Log from "../src/Util";
import {expect} from 'chai';
import InsightFacade from "../src/controller/InsightFacade";
import {InsightResponse} from "../src/controller/IInsightFacade";
import path = require('path');
import {QueryRequest} from "../src/controller/QueryController";

describe("InsightFacade", function () {

    var zipFileContents: string = null;
    var facade: InsightFacade = null;
    before(function () {
        Log.info('InsightController::before() - start');
        // this zip might be in a different spot for you
        zipFileContents = new Buffer(fs.readFileSync('../cpsc310d1public_team65/310courses.1.0.zip')).toString('base64');
        try {
            // what you delete here is going to depend on your impl, just make sure
            // all of your temporary files and directories are deleted
            fs.unlinkSync('./data/courses.json');
        } catch (err) {
            // silently fail, but don't crash; this is fine
            Log.warn('InsightController::before() - id.json not removed (probably not present)');
        }
        Log.info('InsightController::before() - done');
    });

    beforeEach(function () {
        facade = new InsightFacade();
    });

    it("Should be able to add a add a new dataset (204)", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        return facade.addDataset('courses', zipFileContents).then(function (response: InsightResponse) {
            expect(response.code).to.equal(204);
        }).catch(function (response: InsightResponse) {
            expect.fail('Should not happen');
        });
    });

    it("Should be able to update an existing dataset (201)", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        return facade.addDataset('courses', zipFileContents).then(function (response: InsightResponse) {
            expect(response.code).to.equal(201);
        }).catch(function (response: InsightResponse) {
            expect.fail('Should not happen');
        });
    });

    it("Should not be able to add an invalid dataset (400)", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        return facade.addDataset('courses', 'some random bytes').then(function (response: InsightResponse) {
            console.log("Shouldn't get here, code: " + response.code);
            expect.fail();
        }).catch(function (response: InsightResponse) {
            expect(response.code).to.equal(400);
        });
    });

    it("Should be able to D2 query", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        let query: QueryRequest = {
            "GET": ["courses_id", "courseAverage"],
            "WHERE": {"IS": {"courses_dept": "cpsc"}} ,
            "GROUP": [ "courses_id" ],
            "APPLY": [ {"courseAverage": {"AVG": "courses_avg"}} ],
            "ORDER": { "dir": "UP", "keys": ["courseAverage", "courses_id"]},
            "AS":"TABLE"
        };
        let file: string = "response7.json";
        let fullpath: string = path.join('./test/', file);
        let res: any = null;
        try {
            fs.accessSync(fullpath, fs.F_OK); // Check if file exists/is accessable before reading
            res = JSON.parse(fs.readFileSync(fullpath).toString()); // Read file
        } catch (err) {
            expect.fail(err);
        }
        return facade.addDataset('courses', zipFileContents).then(function (response: InsightResponse) {
            facade.performQuery(query).then(function (result) {
                console.log(result.code);
                expect(result.body).to.deep.equal(res);
            }).catch(function (err) {
                expect.fail(err);
            });
        }).catch(function (response: InsightResponse) {
            expect.fail('Should not happen');
        });
    });

    it("USELESS TEST TO REMOVE", function () {
        var that = this;
        Log.trace("Starting test: " + that.test.title);
        let courseQuery: QueryRequest =  {
            "GET": ["courses_dept", "courses_id", "maxSize", "maxFail"],
            "WHERE": {"AND":[{"IS": {"courses_dept": "cpsc"}}, {"NOT": {"IS": {"courses_section": "overall"}}}]},
            "GROUP": [ "courses_dept", "courses_id" ],
            "APPLY": [ {"maxSize": {"SIZE": "courses_pass"}}, {"maxFail": {"MAX": "courses_fail"}}],
            "ORDER": "maxSize",
            "AS":"TABLE"
        };
        let roomsQuery: QueryRequest =  {
            "GET": ["rooms_name", "rooms_seats", "rooms_lat", "rooms_lon"],
            "WHERE": {"IS": {"rooms_shortname": "DMP"}},
            "ORDER": "rooms_seats",
            "AS":"TABLE"
        };
        let countQuery: QueryRequest =  {
            "GET": ["courses_dept", "courses_id", "numSections"],
            "WHERE": {"AND":[{"IS": {"courses_dept": "cpsc"}}, {"NOT": {"IS": {"courses_section": "overall"}}}, {"IS": {"courses_year": "2014"}}]},
            "GROUP": [ "courses_dept", "courses_id" ],
            "APPLY": [ {"numSections": {"COUNT": "courses_uuid"}}],
            "ORDER": "numSections",
            "AS":"TABLE"
        };
        facade.schedule(courseQuery, roomsQuery, countQuery).then(function (result) {
            expect.fail("FAILING IN THEN BLOCK")
        }).catch(function (err) {
            expect.fail(err);
        });
    });
});