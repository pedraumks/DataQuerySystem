/*
 * This should be in the same namespace as your controllers
 */

import {IInsightFacade, InsightResponse} from "./IInsightFacade";
import {QueryRequest, QueryResponse} from "./QueryController";
import DatasetController from "./DatasetController";
import Log from "../Util";
import {Datasets} from '../controller/DatasetController';
import QueryController from '../controller/QueryController';
import ScheduleController from "./ScheduleController";

export default class InsightFacade implements IInsightFacade {
    private datasetController = new DatasetController();
    /**
     * Add a dataset to UBCInsight.
     *
     * @param id  The id of the dataset being added. This is the same as the PUT id.
     * @param content  The base64 content of the dataset. This is the same as the PUT body.
     *
     * The promise should return an InsightResponse for both fullfill and reject.
     * fulfill should be for 2XX codes and reject for everything else.
     */
    public addDataset(id: string, content: string): Promise<InsightResponse> {
        let that = this;
        return new  Promise(function(fulfill, reject) {
            let resp: InsightResponse = {
                code: 204, // Assume 204 but should assign it anyways
                body: {}
            };
            that.datasetController.process(id, content).then(function (result) {
                Log.trace('InsightFacade::addDataset(..) - processed - ' + result);
                resp.code = result;
                if (result === 204) {
                    resp.body = {success: 'the operation was successful and the id was new (not PUT in this session or was previously cached).'};
                } else if (result === 201) {
                    resp.body = {success: 'the operation was successful and the id already existed (was PUT in this session or was previously cached).'}
                } else if (result === 400) {
                    // Ideally this should never happen
                    resp.body = {error: "Something went wrong, and handling how it went wrong went wrong. Sorry!"};
                    reject(resp);
                }
                fulfill(resp);
            }).catch(function (err) {
                Log.trace('InsightFacade::addDataset(..) - ERROR: ' + err);
                resp.code = 400;
                resp.body = {error: err};
                reject(resp);
            });
        });
    }

    /**
     * Remove a dataset from UBCInsight.
     *
     * @param id  The id of the dataset to remove. This is the same as the DELETE id.
     *
     * The promise should return an InsightResponse for both fullfill and reject.
     * fulfill should be for 2XX codes and reject for everything else.
     */
    public removeDataset(id: string): Promise<InsightResponse> {
        let that = this;
        return new Promise(function(fulfill, reject) {
            let resp: InsightResponse = {
                code: 204, // Assume 204 but should assign it anyways
                body: {}
            };
            that.datasetController.deleteDataset(id).then(function(result: number) {
                resp.code = result;
                resp.body = {status: 'the operation was successful.'};
                fulfill(resp);
            }).catch(function(err: number) {
                resp.code = err;
                resp.body = {status: 'the operation was unsuccessful because the delete was for a resource that was not previously PUT.'};
                reject(resp);
            });
        });
    }

    /**
     * Perform a query on UBCInsight.
     *
     * @param query  The query to be performed. This is the same as the body of the POST message.
     * @return Promise <InsightResponse>
     * The promise should return an InsightResponse for both fullfill and reject.
     * fulfill should be for 2XX codes and reject for everything else.
     */
    public performQuery(query: QueryRequest): Promise<InsightResponse> {
        let that = this;
        return new Promise(function(fulfill, reject) {
            let resp: InsightResponse = {
                code: 200, // Assume 200 but should assign it anyways
                body: {}
            };

            try {
                let datasets: Datasets = that.datasetController.getDatasets();
                let controller = new QueryController(datasets);
                let isValid = controller.isValid(query);

                if (isValid === true) {
                    let result: QueryResponse = controller.query(query);
                    resp.code = controller.getStatusCode();
                    if (resp.code === 424) {
                        resp.body = {missing: controller.getMissingIds()};
                        reject(resp);
                    } else if (resp.code === 200) {
                        resp.body = result;
                        fulfill(resp);
                    } else if (resp.code === 400) {
                        resp.body = {error: controller.getStatusMessage()};
                        reject(resp);
                    }
                } else {
                    resp.code = 400;
                    resp.body = {error: controller.getStatusMessage()};
                    reject(resp);
                }
            } catch (err) {
                Log.error('InsightFacade::postQuery(..) - ERROR: ' + err);
                resp.code = 400;
                resp.body = {error: 'Something went very wrong'};
                reject(resp);
            }
        });
    }

    public schedule(coursesQuery: QueryRequest, roomsQuery: QueryRequest, countsQuery: QueryRequest): Promise<InsightResponse> {
        let that = this;
        return new Promise(function (fulfill, reject) {
            let resp: InsightResponse = {
                code: 400, // TODO Assume 200 but should assign it anyways
                body: {}
            };
            try {
                let courses: Array<any> = null;
                let rooms: Array<any> = null;
                let counts: Array<any> = null;
                var promiseArr: Promise<void>[] = [];
                promiseArr.push(that.performQuery(coursesQuery).then(function(result) {
                    courses = (<QueryResponse>result.body).result;
                }));
                promiseArr.push(that.performQuery(roomsQuery).then(function(result) {
                    rooms = (<QueryResponse>result.body).result;
                }));
                promiseArr.push(that.performQuery(countsQuery).then(function(result) {
                    counts = (<QueryResponse>result.body).result;
                }));
                Promise.all(promiseArr).then(function() {
                    let controller = new ScheduleController(courses, rooms, counts);
                    resp.code = 200;
                    resp.body = controller.makeSchedule();
                    fulfill(resp);
                }).catch(function(err) {
                });
            } catch (err) {
                Log.error('InsightFacade::schedule(..) - ERROR: ' + err);
                resp.code = 400;
                resp.body = {error: 'Something went very wrong'};
                reject(resp);
            }
        });
    }
}