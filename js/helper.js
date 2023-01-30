Node.prototype.appendHTML = function (html) {
    this.insertAdjacentHTML('beforeend', html);
}

window.structuredClone = window.structuredClone || {};

function appendOrdinalSuffix(num) {
    console.log('num', num);
    if (num >= 10 && num <= 20) {
        return num + "th";
    }
    var j = num % 10;
    if (j === 1) {
        return num + "st";
    }
    if (j === 2) {
        return num + "nd";
    }
    if (j === 3) {
        return num + "rd";
    }
    console.log("num", num);
    return num + "th";
}

const romanLookup = {
    1000: 'M', 900: 'CM', 500: 'D', 400: 'CD',
    100: 'C', 90: 'XC', 50: 'L', 40: 'XL',
    10: 'X', 9: 'IX', 5: 'V', 4: 'IV', 1: 'I'
}

function romanize(num) {
    let roman = '';
    for (let i of Object.keys(romanLookup).reverse()) {
        while (num >= i) {
            roman += romanLookup[i];
            num -= i;
        }
    }
    return roman;
}

const parseDate = (date) => {
    const match = date.match(/^(?:(?:(?<Day>(?:3[0-1]|[1-2]\d|0?[1-9]))(?:[\s/-]))?(?<Month>(?:(?:1[0-2]|0?[1-9])|jan(?:uary|\.)?|feb(?:ruary|\.)?|mar(?:ch|\.)?|apr(?:il|\.)?|may.?|june?\.?|july?\.?|aug(?:ust)?\.?|sep(?:t|tember)?\.?|Oct(?:ober)?\.?|nov(?:ember)?\.?|dec(?:ember)?\.?))(?:[\s/-]))?(?<Year>\d{4})$/i);
    
    if (!match) throw "unsupported date format";
    return new Date((match.groups.Month ?? "1") + " " + (match.groups.Day ?? "1") + " " + match.groups.Year);
}

/* To Title Case © 2018 David Gouch | https://github.com/gouch/to-title-case */
String.prototype.toTitleCase = function () {
    'use strict'
    var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v.?|vs.?|via|with)$/i
    var alphanumericPattern = /([A-Za-z0-9\u00C0-\u00FF])/
    var wordSeparators = /([ :–—-])/
    
    return this.split(wordSeparators)
        .map(function (current, index, array) {
            if (
                /* Check for small words */
                current.search(smallWords) > -1 &&
                /* Skip first and last word */
                index !== 0 &&
                index !== array.length - 1 &&
                /* Ignore title end and subtitle start */
                array[index - 3] !== ':' &&
                array[index + 1] !== ':' &&
                /* Ignore small words that start a hyphenated phrase */
                (array[index + 1] !== '-' ||
                    (array[index - 1] === '-' && array[index + 1] === '-'))
            ) {
                return current.toLowerCase()
            }
            
            /* Ignore intentional capitalization */
            if (current.substr(1).search(/[A-Z]|\../) > -1) {
                return current
            }
            
            /* Ignore URLs */
            if (array[index + 1] === ':' && array[index + 2] !== '') {
                return current
            }
            
            /* Capitalize the first letter */
            return current.replace(alphanumericPattern, function (match) {
                return match.toUpperCase()
            })
        })
        .join('').trim()
}

/**
 * Recursively sets the properties of the element to the values in the specified object.
 * @param {HTMLElement} element The element to set the properties on.
 * @param {object} properties An object containing properties and their values.
 */
function setProperties(element, properties) {
    // Iterate over the key-value pairs in the object
    for (const [key, value] of Object.entries(properties)) {
        // If the value is an object, recursively set its properties
        if (typeof value === 'object') {
            setProperties(element[key], value);
        } else {
            // Otherwise, set the property to the value
            element[key] = value;
        }
    }
}

/**
 * Creates a new HTML element with the specified tag, properties, ID, and attributes.
 * @param {string} tag The HTML tag of the element to be created.
 * @param {string|object} [elementOptions] An object containing properties and values to be set on the element, or a string containing the class name for the element.
 * @param {string} [id] The ID for the element.
 * @return {HTMLElement} The created HTML element.
 */
const create = function (tag, elementOptions, id) {
    // Create a new element with the specified tag
    let temp = document.createElement(tag);
    
    // If elementOptions is provided, set the appropriate properties or className on the element
    if (elementOptions) {
        if (typeof elementOptions === 'object') {
            setProperties(temp, elementOptions);
        } else {
            temp.className = elementOptions;
        }
    }
    // If id is provided, set the id property on the element
    if (id) temp.id = id;
    
    // If attrs is provided, iterate over the properties and set the corresponding attributes on the element
    // if (attrs) {
    //     for (const property in attrs) {
    //         temp.setAttribute(property, attrs[property]);
    //     }
    // }
    
    // Return the created element
    return temp;
}


let generateId = (_length = 8) => {
    let chr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789",
        chrLength = chr.length,
        result = "_";
    for (let i = 0; _length - 1 > i; i++) {
        result += chr.charAt(Math.floor(chrLength * Math.random()));
    }
    return result;
}

/**
 * Makes an HTTP request and calls a callback function when the response is received.
 * @param {Object} params - An object containing the following properties:
 *   - {string} url - The URL to make the request to.
 *   - {string} [type='none'] - The type of the request (e.g. 'GET', 'POST').
 * @param {function} callback - The callback function to be called when the response is received.
 * @return {void}
 */
function requestFetch(params, callback) {
    window.smartFetchCallbacks ??= {};
    let tempId = generateId(8);
    smartFetchCallbacks[tempId] = function () {
        callback.apply(null, arguments);
        delete smartFetchCallbacks[tempId];
    };
    document.dispatchEvent(new CustomEvent("smartFetch", {
        detail: {
            url: params.url,
            type: params.type || 'none',
            callback: tempId
        }
    }));
}

// region helper to get data for the web dodging the CORS
document.addEventListener('smartFetchResponse', function (data) {
    console.log('smartFetchResponse', data.detail);
    smartFetchCallbacks[data.detail.callback](data.detail.response)
}, false);

const templateContent = document.querySelector('#template').content
const selectOptions = {
    "titles-types": ["TV series", "TV Mini Series", "Movie", "Anime"],
    "show-status": ["Upcoming", "Ongoing", "Ended", "Canceled"],
    "title-user-status": ["Watching", "Completed", "On-Hold", "Dropped", "Plan to Watch", "Pending"],
    "title-rating": [
        [10, "10 - Masterpiece"],
        [9, "9 - Great"],
        [8, "8 - Very Good"],
        [7, "7 - Good"],
        [6, "6 - Fine"],
        [5, "5 - Average"],
        [4, "4 - Bad"],
        [3, "3 - Very Bad"],
        [2, "2 - Horrible"],
        [1, "1 - Appalling"]
    ],
    "titles-languages": ["English", "Korean", "Spanish", "Japanese", "French", "Other"],
    "title-relations": ["sequel", "prequel", "related"]
    
}

// init selects
templateContent.querySelectorAll('select[data-init-select]').forEach(select => {
    console.log(select.dataset.initSelect);
    if (selectOptions[select.dataset.initSelect]) {
        select.innerHTML = `<option selected></option>` + selectOptions[select.dataset.initSelect]
            .map((value) => typeof value === "string" ? `<option>${value}</option>` : `<option value="${value[0]}">${value[1]}</option>`).join('');
    } else {
        throw select.dataset.initSelect + " is not found in selectOptions"
    }
});

const templates = Object.assign({}, ...Array.from(templateContent.children).map(n => ({[n.id || n.dataset.templateName]: n})));


const Helper = (() => {
    const localScripts = {
        dexie: 'libraries/Dexie.js-3.2.2/dist/dexie.min.js'
    }
    let installedScripts = [];
    
    
    /**
     * resize image and return blob
     * @param blobURL
     * @return {Promise<Blob>}
     */
    function resizePoster(blobURL) {
        function calculateSize(img, maxWidth, maxHeight) {
            let width = img.width;
            let height = img.height;
            
            // calculate the width and height, constraining the proportions
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }
            return [width, height];
        }
        
        return new Promise((resolve, reject) => {
            const MAX_WIDTH = 210;
            const MAX_HEIGHT = 301;
            const MIME_TYPE = "image/jpeg";
            const QUALITY = 0.9;
            
            const img = new Image();
            img.src = blobURL;
            img.onerror = function () {
                URL.revokeObjectURL(blobURL);
                // Handle the failure properly
                reject('Cannot load image');
            };
            img.onload = function () {
                // URL.revokeObjectURL(blobURL);
                const [newWidth, newHeight] = calculateSize(img, MAX_WIDTH, MAX_HEIGHT);
                const canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext("2d");
                
                // show white color if there is transparent
                ctx.fillStyle = "#FFF";
                ctx.fillRect(0, 0, newWidth, newHeight);
                
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                canvas.toBlob(
                    blob => resolve(blob),
                    MIME_TYPE,
                    QUALITY
                );
                // document.body.append(canvas);
            };
        });
        
    }
    
    /**
     *
     * @param image_url
     * @param requestBlob if true, you will get blob instead of objectUrl
     * @return {Promise<Blob|String>}
     */
    let getImageFromAnywhere = async (image_url, requestBlob = false) => {
        return await new Promise((resolve, reject) => {
            // try to fetch the image from Word up server / or cache
            requestFetch({
                url: image_url
            }, function (r) {
                // if no error
                if (!r.error) {
                    // if data type uint8array handle it
                    if (r.type === 'Uint8Array') {
                        let imageBlob = new Blob([new Uint8Array(r.value).buffer], {type: r.fileType});
                        
                        if (requestBlob) {
                            resolve(imageBlob);
                        } else {
                            resolve(URL.createObjectURL(imageBlob));
                        }
                    } else {
                        // if not uint8array learn how to handle it
                        console.error('new file type discovered', r.type)
                        reject({
                            type: 1, // unhandled data
                            text: 'new file type discovered : ' + r.type,
                            imageUrl: image_url
                        })
                    }
                } else {
                    // if image not found in server
                    if (r.code === 404) {
                        // image is not in db also
                        reject({
                            type: 2, // img not found in server
                            text: 'image not found in server',
                            imageUrl: image_url
                        });
                    } else {
                        // new error
                        console.log('error', r);
                        reject({
                            type: 3, // unknown error
                            text: 'unknown error (check error data attached)',
                            data: r,
                            usedData: image_url
                        })
                    }
                }
            });
        })
    };
    
    return {
        
        domFromHTML(html) {
            const template = document.createElement('template');
            template.innerHTML = html.trim();
            return template.content.firstChild;
        },
        formatDate(d) {
            let dt = ("0" + d.getDate()).slice(-2),
                mt = ("0" + (d.getMonth() + 1)).slice(-2),
                yr = d.getFullYear()
            
            return (dt + '-' + mt + '-' + yr)
        },
        installScript(...s) {
            return new Promise((resolve, reject) => {
                if (s.every(sn => localScripts[sn] !== undefined)) {
                    let scripts = s.map(script_name => {
                        return new Promise(resolve => {
                            if (installedScripts[script_name]) {
                                resolve(true);
                                return;
                            }
                            
                            $.ajax({
                                url: localScripts[script_name],
                                dataType: "script",
                                success: function () {
                                    installedScripts.push(script_name);
                                    resolve(true);
                                },
                                cache: true
                            });
                        });
                    });
                    Promise.all(scripts).then(n => {
                        console.log('worked');
                        resolve(true);
                    })
                    console.log('scripts', scripts);
                } else {
                    console.log('some are undefined');
                    reject('some are undefined');
                }
            })
        },
        
        async getImage(url, isBlob) {
            return await new Promise((resolve, reject) => {
                getImageFromAnywhere(url, isBlob).then(n => {
                    resolve(n);
                }).catch(err => {
                    if (err.type === 2) {
                        console.log('image not found in web')
                    }
                    reject(err);
                });
            });
        },
        
        
        resizePoster: resizePoster
    }
})()