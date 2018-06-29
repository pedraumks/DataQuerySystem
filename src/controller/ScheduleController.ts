/**
 * Created by Lucas on 11/24/2016.
 */

import {QueryResponse} from "./QueryController";
import Log from "../Util";

export interface ScheduleResponse {
    schedule: Array<any>;
    score: number;
    notScheduled: Array<any>;
}

export default class ScheduleController {
    private courseList: Array<any> = null;
    private roomList: Array<any> = null;
    private sections: Array<any> = [];
    private sectionCounts: Array<any> = null;
    private notScheduled: Array<any> = [];

    constructor(courses: Array<any>, rooms: Array<any>, counts:Array<any>) {
        this.courseList = courses;
        this.roomList = rooms;
        this.sectionCounts = counts;
    }

    public makeSchedule(): any {
        Log.trace('ScheduleController::makeSchedule - Starting');
        this.parseCourseList();
        this.parseRooms();
        let totalScore = 0;
        let failScore = 0;
        // For each section from largest to smallest
        for(var i = 0; i < this.sections.length; i++) {
            let section = this.sections[i];
            let booked = false;
            totalScore += section['maxSize'];
            // Try the next smallest room
            for(var j = 0; j < this.roomList.length; j++) {
                let room = this.roomList[j];
                // If it can fit in this room
                if(this.fits(section, room)) {
                    // Try and book it
                    // First if is just some randomization so it doesn't stack MWF
                    if(i % 2 === 0) {
                        if(this.bookMWF(section, room)) {
                            booked = true;
                            break;
                        } else if(this.bookTT(section, room)) {
                            booked = true;
                            break;
                        }
                    } else {
                        if(this.bookTT(section, room)) {
                            booked = true;
                            break;
                        } else if(this.bookMWF(section, room)) {
                            booked = true;
                            break;
                        }
                    }
                }
            }
            if(!booked) {
                failScore += section['maxSize'];
                let id = section['courses_dept'] + section['courses_id'];
                if(this.notScheduled.indexOf(id) === -1) {
                    this.notScheduled.push(section['courses_dept'] + section['courses_id']);
                }
            }
        }
        Log.trace('ScheduleController::makeSchedule - Exiting');
        let resp: ScheduleResponse = {
            schedule: null,
            score: null,
            notScheduled: null
        }
        resp.schedule = this.roomList;
        resp.score = Number(((1 - (failScore/totalScore)) * 100).toFixed(2));
        resp.notScheduled = this.notScheduled;
        return resp;
    }

    private parseCourseList() {
        for(var i = 0; i < this.courseList.length; i++) {
            let numSecs = 1;
            let course1 = this.courseList[i];
            course1['MWF_Taken'] = new Array(18);
            course1['TT_Taken'] = new Array(18);
            for(var k = 0; k < 18; k++) {
                course1['MWF_Taken'][k] = false;
                course1['TT_Taken'][k] = false;
            }
            for(var j = 0; j < this.sectionCounts.length; j++) {
                let course2 = this.sectionCounts[j];
                if(course1['courses_dept'] === course2['courses_dept'] && course1['courses_id'] === course2['courses_id']) {
                    numSecs = Math.ceil(course2['numSections'] / 3);
                    break;
                    // TODO Handle bad room sizes?
                }
            }
            for (var l = 0; l < numSecs; l++) {
                this.sections.push(course1);
            }
        }/*
        this.sections.sort(function(a:any,b:any) { // Sorting high to low
            if (a['maxSize'] > b['maxSize']) {
                return -1;
            }
            else if (a['maxSize'] < b['maxSize']) {
                return 1;
            }
            else
                return 0;
        });*/
    }

    private parseRooms() {
        for(var i = 0; i < this.roomList.length; i++) {
            let room = this.roomList[i];
            room['MWF'] = new Array(18);
            room['TT'] = new Array(18);
            for(var j = 0; j < 18; j++) {
                room['MWF'][j] = null;
                room['TT'][j] = null;
            }
        }
        this.roomList.sort(function(a:any,b:any) { // Sorting low to high
            if (a['rooms_seats'] > b['rooms_seats']) {
                return 1;
            }
            else if (a['rooms_seats'] < b['rooms_seats']) {
                return -1;
            }
            else
                return 0;
        });
    }

    private fits(course: any, room: any): boolean {
        return course['maxSize'] <= room['rooms_seats'];
    }

    private bookMWF(course: any, room: any): boolean {
        for(var i = 0; i < 18; i += 2) {
            if(!course['MWF_Taken'][i] && room['MWF'][i] === null) {
                course['MWF_Taken'][i] = true;
                course['MWF_Taken'][i+1] = true;
                room['MWF'][i] = course['courses_dept'] + course['courses_id'];
                room['MWF'][i+1] = course['courses_dept'] + course['courses_id'];
                return true;
            }
        }
        return false;

    }

    private bookTT(course: any, room: any): boolean {
        for(var j = 0; j < 18; j += 3) {
            if(!course['TT_Taken'][j] && room['TT'][j] === null) {
                course['TT_Taken'][j] = true;
                course['TT_Taken'][j+1] = true;
                course['TT_Taken'][j+2] = true;
                room['TT'][j] = course['courses_dept'] + course['courses_id'];
                room['TT'][j+1] = course['courses_dept'] + course['courses_id'];
                room['TT'][j+2] = course['courses_dept'] + course['courses_id'];
                return true;
            }
        }
        return false;

    }
}