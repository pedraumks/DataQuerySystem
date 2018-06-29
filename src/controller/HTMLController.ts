/**
 * Created by Lucas on 11/11/2016.
 */
import Log from "../Util";
var parse5 = require('parse5'); // Documentation said to do it this way

export default class HTMLController {
    private document: any;

    constructor(content: any) {
        this.document = parse5.parse(content);
    }

    /**
     * Some ugly hardcoded traversal which we can easily change but haven't. Gets a string of the building shortnames
     * @returns {Array<string>} e.g. ['DMP', 'MATH', 'SWNG']
     */
    public parseIndex(): Array<string> {
        // Horrible hard coding for testing, but it works
        let tbody = this.document.childNodes[6].childNodes[3].childNodes[31].childNodes[10].childNodes[1].childNodes[3].childNodes[1].childNodes[5].childNodes[1].childNodes[3];
        // Table rows are odd numbered child rows
        let roomCodes: Array<string> = [];
        for (var i = 1; i < tbody.childNodes.length; i += 2) {
            roomCodes.push(tbody.childNodes[i].childNodes[3].childNodes[0].value.trim());
        }
        return roomCodes;
    }

    /**
     * Gets all the data from a building file
     * @param shortName e.g. DMP
     * @returns {any} Object with {result: []} format, to match how courses in the course dataset is formatted
     */
    public parseBuilding(shortName: string): any { // Will always be an object, but I'm sure we'd cast to any later anyways
        let newRooms: any = {result: []};
        try {
            let fullName = this.getRoomsFullname();
            let address = this.getRoomsAddress();

            let table: any = this.getRoomsTableBody(this.document);
            for (var i = 1; i < table.childNodes.length; i += 2) {
                let room = <any>{}; // This is bad and I should feel bad
                let number = this.getRoomsNumber(table.childNodes[i]);
                room['rooms_fullname'] = fullName;
                room['rooms_shortname'] = shortName;
                room['rooms_number'] = number;
                room['rooms_name'] = shortName + '_' + number;
                room['rooms_address'] = address;
                room['rooms_seats'] = this.getRoomsSeats(table.childNodes[i]);
                room['rooms_type'] = this.getRoomsType(table.childNodes[i]);
                room['rooms_furniture'] = this.getRoomsFurniture(table.childNodes[i]);
                room['rooms_href'] = this.getRoomsHref(table.childNodes[i]);
                newRooms.result.push(room);
            }
            return newRooms;
        } catch (err) {
            // This seemed to magically stop happening...
            throw "Data missing";
        }
    }

    /**
     * Used to search for IDs or classes in HTML
     * @param nameTarget the HTML property to target, e.g. id, class
     * @param valueTarget the value of the id or class
     * @returns {any}
     */
    public getByAttribute(nameTarget: string, valueTarget: string): any {
        return this.fullTraversalHelper(this.document, nameTarget, valueTarget);
    }

    /**
     * Traverse the whole HTML document, returning the element with nameTarget = valueTarget
     * @param content the HTML document/component to search
     * @param nameTarget e.g. id, class
     * @param valueTarget e.g. building-info
     * @returns {any} HTML content
     */
    private fullTraversalHelper(content: any, nameTarget: string, valueTarget: string): any {
        // If it has attributes
        if (content.hasOwnProperty('attrs') && content['attrs'].length > 0) {
            let attrs = content['attrs'];
            // For each attribute
            for (var attr of attrs) {
                // If it has an id/class/etc
                if (attr['name'] === nameTarget) {
                    // See if it's the one we want
                    if (attr['value'].indexOf(valueTarget) !== -1) {
                        return content;
                    }
                }
            }
        }
        // Return if it's a leaf node
        if (typeof content.childNodes === 'undefined') {
            return;
        }
        // Check all children
        for (var node of content.childNodes) {
            let res: any = this.fullTraversalHelper(node, nameTarget, valueTarget);
            if (typeof res !== 'undefined') {
                return res;
            }
        }
    }

    // Semi hardcoded ugliness below

    private getRoomsTableBody(content: any) {
        return this.fullTraversalHelper(content, 'id', 'block-system-main').childNodes[1].childNodes[5].childNodes[1].childNodes[3].childNodes[1].childNodes[3];
    }

    private getRoomsFullname() {
        //                                                h2            span          text
        return this.getByAttribute('id', 'building-info').childNodes[1].childNodes[0].childNodes[0].value.trim();
    }

    private getRoomsAddress() {
        //                                                div           div           text
        return this.getByAttribute('id', 'building-info').childNodes[3].childNodes[0].childNodes[0].value.trim();
    }

    private getRoomsNumber(row: any) {
        return row.childNodes[1].childNodes[1].childNodes[0].value.trim();
    }

    private getRoomsSeats(row: any) {
        return parseInt(row.childNodes[3].childNodes[0].value.trim());
    }

    private getRoomsFurniture(row: any) {
        return row.childNodes[5].childNodes[0].value.trim();
    }

    private getRoomsType(row: any) {
        return row.childNodes[7].childNodes[0].value.trim();
    }

    private getRoomsHref(row: any) {
        return row.childNodes[9].childNodes[1]['attrs'][0]['value'].trim();
    }

    /**
     * Checks if the body of the HTML document we get has some expected class values
     * @returns {boolean}
     */
    public sketchyValidityCheck() {
        return(typeof this.fullTraversalHelper(this.document, 'class', 'html not-front not-logged-in no-sidebars page-campus page-campus-discover page-campus-discover-buildings-and-classrooms') !== 'undefined');
    }

    /**
     * Sends a get request for a location data object with lat and lon properties
     * @param address the address of the building the room is in
     * @returns {Promise<T>}
     */
    public static sendGetRequest(address:any): Promise<any> {
        return new Promise(function(fulfill, reject) {
            let urlEncodedAddress = encodeURIComponent(address.trim());
            //console.log(urlEncodedAddress);
            var http = require('http');
            var options = {
                host: 'skaha.cs.ubc.ca',
                port: 8022,
                path: '/api/v1/team65/' + urlEncodedAddress,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            var req = http.get(options, function(res:any) {
                var bodyChunks:any = [];
                res.on('data', function(chunk:any) {
                    bodyChunks += chunk;
                }).on('end', function() {
                    var obj = JSON.parse(bodyChunks);
                    fulfill(obj);
                })
            });

            req.on('error', function(e:any) {
                console.log('ERROR: ' + e.message);
                reject(e.message);
            });
        });
    }

    /**
     * Calls sendGetRequest and adds it to all rooms in the building
     * @param rooms an array of rooms from the same building (share same location)
     * @returns {Promise<T>}
     */
    public static addLocData(rooms: Array<any>): Promise<any> {
        return new Promise(function(fulfill, reject) {
            // Pull address from first room
            HTMLController.sendGetRequest(rooms[0]['rooms_address']).then(function(res: any) {
                // Add returned location data to each room
                for (var room of rooms) {
                    room['rooms_lat'] = res['lat'];
                    room['rooms_lon'] = res['lon'];
                }
                fulfill(true);
            }).catch(function(err: any) {
                reject(err);
            });
        });
    }
}