/**
 * Created by rtholmes on 2016-09-03.
 */

import DatasetController from "../src/controller/DatasetController";
import Log from "../src/Util";

import JSZip = require('jszip');
import {expect} from 'chai';
import fs = require('fs');

describe("DatasetController", function () {

    beforeEach(function () {
    });

    afterEach(function () {
    });

    it("Should be able to receive a Dataset with courses as id", function () {
        Log.test('Creating dataset');
        let zipFileContents = new Buffer(fs.readFileSync('./smallTestDataset.zip')).toString('base64');
        let controller = new DatasetController();
        return controller.process('courses', zipFileContents).then(function(result) {
            expect(result).to.not.equal(400);
        });
    });

    it("Should be able to receive a Dataset with rooms as id", function () {
        Log.test('Creating dataset');
        let zipFileContents = new Buffer(fs.readFileSync('./smallTestDataset2.zip')).toString('base64');
        let controller = new DatasetController();
        return controller.process('rooms', zipFileContents).then(function(result) {
            expect(result).to.not.equal(400);
        });
    });

    it("Should be able to delete an existing Dataset", function () {
        Log.test('Creating dataset');
        let zipFileContents = new Buffer(fs.readFileSync('./smallTestDataset.zip')).toString('base64');
        let controller = new DatasetController();
        return controller.deleteDataset('courses').then(function(result) {
            expect(result).to.equal(204);
        });
    });

    //TODO:FIX
    it("Should be not be able to delete a non existing Dataset", function () {
        Log.test('Creating dataset');
        let zipFileContents = new Buffer(fs.readFileSync('./smallTestDataset.zip')).toString('base64');
        let controller = new DatasetController();
        return controller.deleteDataset('courses').then(function(result) {
            expect.fail("Shouldn't get here");
        }).catch(function (err) {
            expect(err).to.exist;
        });
    });

    //TODO: Probably change the associated error message
    it("Should not be able to receive an invalid Dataset", function () {
        Log.test('Creating dataset');
        let zipFileContents = new Buffer(fs.readFileSync('./README.md')).toString('base64');
        let controller = new DatasetController();
        return controller.process('README', zipFileContents).then(function(result) {
            expect.fail("Shouldn't get here");
        }).catch(function (err) {
            expect(err).to.exist;
        });
    });

    it("Should be not be able to process a Dataset that does not have rooms or courses as id", function () {
        Log.test('Creating dataset');
        let zipFileContents = new Buffer(fs.readFileSync('./smallTestDataset.zip')).toString('base64');
        let controller = new DatasetController();
        return controller.process('course', zipFileContents).then(function(result) {
            expect.fail("Shouldn't get here");
        }).catch(function (err) {
            expect(err).to.exist;
        });
    });

    /**
    it("Should be able to get datasets from memory", function () {
        let controller = new DatasetController();
        let datasets =  controller.getDatasets();
        //console.log(datasets);
        expect(datasets).to.equal('courses.json');
    });*/

    //TODO: deleting existing dataset, deleting non-existing dataset
});
