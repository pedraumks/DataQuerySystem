/**
 * Created by rtholmes on 2016-06-14.
 */
import restify = require('restify');
import fs = require('fs');

import {QueryRequest} from "../controller/QueryController";
import Log from '../Util';
import InsightFacade from "../controller/InsightFacade";
import {InsightResponse} from "../controller/IInsightFacade";
import CalendarController from "../controller/CalendarController";

export default class RouteHandler {

    private static insightFacade = new InsightFacade();

    public static getHomepage(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RoutHandler::getHomepage(..)');
        fs.readFile('./src/rest/views/index.html', 'utf8', function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

    public static  putDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RouteHandler::postDataset(..) - params: ' + JSON.stringify(req.params));
        try {
            var id: string = req.params.id;

            // stream bytes from request into buffer and convert to base64
            // adapted from: https://github.com/restify/node-restify/issues/880#issuecomment-133485821
            let buffer: any = [];
            req.on('data', function onRequestData(chunk: any) {
                //Log.trace('RouteHandler::postDataset(..) on data; chunk length: ' + chunk.length);
                buffer.push(chunk);
            });

            req.once('end', function () {
                let concated = Buffer.concat(buffer);
                req.body = concated.toString('base64');
                Log.trace('RouteHandler::postDataset(..) on end; total length: ' + req.body.length);
                let facade = RouteHandler.insightFacade;
                facade.addDataset(id, req.body).then(function (result: InsightResponse) {
                    Log.trace('RouteHandler::postDataset(..) - processed - ' + JSON.stringify(result));
                    res.json(result.code, result.body);
                }).catch(function (err:InsightResponse) {
                    Log.trace('RouteHandler::postDataset(..) - ERROR: ' + JSON.stringify(err));
                    res.json(err.code, err.body);
                });
            });

        } catch (err) {
            Log.error('RouteHandler::postDataset(..) - ERROR: ' + err.message);
            res.send(400, {error: err.message});
        }
        return next();
    }

    public static postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RouteHandler::postQuery(..) - params: ' + JSON.stringify(req.params));
        let query: QueryRequest = req.params;
        let facade = RouteHandler.insightFacade;
        facade.performQuery(query).then(function(result) {
            Log.trace('RouteHandler::postQuery(..) - Returning results');
            res.json(result.code, result.body);
        }).catch(function(err) {
            Log.trace('RouteHandler::postQuery(..) - ERROR: ' + JSON.stringify(err));
            res.json(err.code, err.body);
        });
        return next();
    }

    public static delDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RouteHandler::deleteDataset(..) - params: ' + JSON.stringify(req.params));
        var id: string = req.params.id;
        RouteHandler.insightFacade.removeDataset(id).then(function(result) {
            Log.trace('RouteHandler::deleteDataset(..) - Delete successful');
            res.json(result.code, result.body);
        }).catch(function(err) {
            Log.error('RouteHandler::deleteDataset(..) - ERROR: ' + JSON.stringify(err));
            // Ideally we could customize this error here
            res.json(err.code, err.body);
        });
        return next();
    }

    public static makeSchedule(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RouteHandler::makeSchedule(..)');
        var courses: QueryRequest = req.params.courseQuery;
        var rooms: QueryRequest = req.params.roomQuery;
        var counts: QueryRequest = req.params.countQuery;
        RouteHandler.insightFacade.schedule(courses, rooms, counts).then(function(result: any) {
            Log.trace('RouteHandler::makeSchedule(..) - Made Schedule');
            res.json(result.code, result.body);
        }).catch(function(err) {
            Log.error('RouteHandler::makeSchedule(..) - ERROR: ' + JSON.stringify(err));
            res.json(err.code, err.body);
        });
        return next();
    }

    public static upload(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RouteHandler::upload(..)');
        CalendarController.main(req.params);
        res.json(200, {});
        return next();
    }

}
