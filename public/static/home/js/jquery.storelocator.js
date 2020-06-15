(function ($) {
    $.technogel = $.technogel || {};

    $.technogel.StoreLocator = function () {
        var moduleOptions = {
            displayMapMarkersOnLoad: true,
            onLoadLat: 39.239580,
            onLoadLng: -100.520212,
            onLoadZoom: 5,
            onClickZoom: 14,
            searchLocationsUrl: '',
            locatorSettingsUrl: '',
            listTemplatePath: '',
            infoboxTemplatePath: '',
            bounceMarker: true,
            lengthUnit: 'km',
            metersPerMile: 1609.344,
            translations: {
                directions: 'Directions',
                website: 'Website',
                pillows: 'Pillows',
                mattresses: 'Mattresses',
                seatings: 'Seating Supports',
                vivePillows: 'VIVE Pillows',
                viveMattresses: 'VIVE Mattresses',
                mats: 'Mats',
                kilometers: 'kilometers',
                kilometer: 'kilometer',
                miles: 'miles',
                mile: 'mile'
            },
            availableProductCheckboxes: [
                "hasPillows", "hasMattresses", "hasSeatings",
                "hasVivePillows", "hasViveMattresses", "hasMats"
            ]
        };

        var currentFilter = {
            // location
            coordinates: {
                latitude: null,
                longitude: null
            },
            // checkboxes
            /*hasPillows: false,
            hasMattresses: false,
            hasSeatings: false,
            hasVivePillows: false,
            hasViveMattresses: false,
            hasMats: false,*/
            // ddl
            country: '',
            storeId: ''
        };

        var map;
        var geocoder;
        var autocomplete;
        var storeObjects = [];
        var bounds = new google.maps.LatLngBounds();
        var infobox;
        var listTemplate, infowindowTemplate;
        var settings = {
            stores: [],
            countries: []
        };
        var lastActiveStoreObject = null;

        //infobox
        var infobox = new google.maps.InfoWindow();

        //touch map
        var dragFlag = false;
        var start = 0, end = 0;

        function onMapTouchStart(e) {
            dragFlag = true;
            start = e.touches[0].pageY;
        }

        function onMapTouchEnd() {
            dragFlag = false;
        }

        function onMapTouchMove(e) {
            if (!dragFlag) return;
            end = e.touches[0].pageY;
            window.scrollBy(0, (start - end));
        }

        //Used to round miles to display
        function roundNumber(num, dec) {
            return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
        }

        function bindMapScrollListeners() {
            var mapElement = document.getElementById("map");
            mapElement.addEventListener("touchstart", onMapTouchStart, true);
            mapElement.addEventListener("touchend", onMapTouchEnd, true);
            mapElement.addEventListener("touchmove", onMapTouchMove, true);
        }

        function setCurrentLocation(lat, lng) {
            if (lat && lng) {
                currentFilter.coordinates.latitude = lat;
                currentFilter.coordinates.longitude = lng;
            }
        }

        function initAutocomplete() {
            // Create the autocomplete object, restricting the search to geographical
            // location types.

            var searchInput = $(".js-location-search-text");
            var options = {
                types: ['(regions)']
            };

            autocomplete = new google.maps.places.Autocomplete(searchInput[0], options);

            // When the user selects an address from the dropdown
            autocomplete.addListener('place_changed', function () {
                // Get the place details from the autocomplete object.
                var place = autocomplete.getPlace();
                if (place.geometry) {
                    setCurrentLocation(place.geometry.location.lat(), place.geometry.location.lng());
                    searchLocations();
                } else {
                    searchUserText();
                }
            });
        }

        function getCurrentPositionSucceeded(position) {
            // set default
            moduleOptions.onLoadLat = position.coords.latitude;
            moduleOptions.onLoadLng = position.coords.longitude;
            setCurrentLocation(position.coords.latitude, position.coords.longitude);
            initializeGoogleMap();
            searchLocations();
        }

        function getCurrentPositionFailed(position) {
            console.log('Failed to retrieve geo-location. Error code: ' + position.code);
            setCurrentLocation(moduleOptions.onLoadLat, moduleOptions.onLoadLng);
            initializeGoogleMap();
            searchLocations();
        }

        function getUserGeoLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(getCurrentPositionSucceeded, getCurrentPositionFailed, {
                    enableHighAccuracy: true,
                    maximumAge: 1000 * 60 * 60,
                    timeout: 1000
                });
            } else {
                console.log('Browser doesn’t support geo-location.');
                searchLocations();
            }
        }

        function bindLegendItemClick() {
            $('.js-loc-list li[data-markerid]').on('click', function (e) {
                e.preventDefault();

                var markerid = $(this).data('markerid');

                var storeObject = $.grep(storeObjects, function (store, i) {
                    return store.id == markerid;
                })[0];

                if (storeObject) {
                    openInfoBox(storeObject);
                    var center = new google.maps.LatLng(storeObject.coordinates.latitude, storeObject.coordinates.longitude);
                    //map.setZoom(moduleOptions.onClickZoom);
                    map.setCenter(center);
                }
            })
        }

        function drawLegendItems() {
            var container = $(".js-loc-list");
            container.empty();
            $.each(storeObjects, function (index, item) {
                var htmlResult = listTemplate(item);
                container.append(htmlResult);
            });

            bindLegendItemClick();
        }

        // Deletes all markers in the array by removing references to them.
        function deleteMarkers() {
            for (var i = 0; i < storeObjects.length; i++) {
                storeObjects[i].marker.setMap(null);
            }
            storeObjects = [];
        }

        function openInfoBox(storeObject) {
            if (infobox.currentId !== storeObject.id) {
                if (infobox.opened) {
                    infobox.close();
                }

                infobox.currentId = storeObject.id;

                //Set up the infowindow template with the location data
                var formattedAddress = infowindowTemplate(storeObject);
                infobox.setContent(formattedAddress);
                // animation
                if (moduleOptions.bounceMarker === true) {
                    storeObject.marker.setAnimation(google.maps.Animation.BOUNCE);
                    setTimeout(function () {
                        storeObject.marker.setAnimation(null);
                        infobox.open(map, storeObject.marker);
                    }, 700);
                }
                else {
                    infobox.open(map, storeObject.marker);
                }
                infobox.opened = true;
            }
        }

        function addListenerForMarker(storeObject) {
            var marker = storeObject.marker;
            google.maps.event.addListener(marker, 'click', function () {
                openInfoBox(storeObject);
            });
        }

        function prepareDistance(storeObject) {
            var distance = storeObject.distance;
            if (moduleOptions.lengthUnit === "km") {
                storeObject.distance = roundNumber(distance / 1000, 2);
                storeObject.lengthUnit = distance <= 1
                    ? moduleOptions.translations.kilometer
                    : moduleOptions.translations.kilometers;
            } else {
                storeObject.distance = roundNumber(distance / moduleOptions.metersPerMile, 2);
                storeObject.lengthUnit = distance <= 1
                    ? moduleOptions.translations.mile
                    : moduleOptions.translations.miles;
            }
        }

        function setMarkers(locations) {
            // clear bounds
            bounds = new google.maps.LatLngBounds();
            // add currentLocation
            var currenLocation = new google.maps.LatLng(currentFilter.coordinates.latitude, currentFilter.coordinates.longitude);
            bounds.extend(currenLocation);
            // add markers
            for (var i = 0; i < locations.length; i++) {
                var storeObject = locations[i];
                // extend values with translations
                storeObject.pillows = storeObject.pillows ? moduleOptions.translations.pillows : '';
                storeObject.mattresses = storeObject.mattresses ? moduleOptions.translations.mattresses : '';
                storeObject.seatings = storeObject.seatings ? moduleOptions.translations.seatings : '';
                storeObject.vivePillows = storeObject.vivePillows ? moduleOptions.translations.vivePillows : '';
                storeObject.viveMattresses = storeObject.viveMattresses ? moduleOptions.translations.viveMattresses : '';
                storeObject.mats = storeObject.mats ? moduleOptions.translations.mats : '';
                // prepare distance and lengthUnit
                prepareDistance(storeObject);

                var latLng = new google.maps.LatLng(storeObject.coordinates.latitude, storeObject.coordinates.longitude);

                storeObject.marker = new google.maps.Marker({
                    position: latLng,
                    map: map,
                    draggable: false
                });

                addListenerForMarker(storeObject);

                bounds.extend(latLng);

                // add to array - needed to clear map
                storeObjects.push(storeObject);
            }
            // move to the first marker
            if (storeObjects.length > 0) {
                var center = new google.maps.LatLng(storeObjects[0].coordinates.latitude, storeObjects[0].coordinates.longitude);
                map.setCenter(center);
            }
            // "autozoom"
            //map.fitBounds(bounds);
            //map.panToBounds(bounds);
        }

        var searchLocationsFail = function (result) {
            //alert("");
        };

        var searchLocationsCallback = function (result) {
            deleteMarkers();
            if (result.length > 0) {
                setMarkers(result);
                drawLegendItems();
            } else {
                var container = $(".js-loc-list");
                container.empty();
                var noResults = "<li>No results</>";
                container.append(noResults);
            }
        };

        function searchLocations() {
            console.log(currentFilter);

            $.ajax({
                url: moduleOptions.searchLocationsUrl,
                datatype: "json",
                data: currentFilter,
                type: "GET"
            }).done(searchLocationsCallback).fail(searchLocationsFail);
        }

        function bindCountryDdl() {
            var $selectControl = $("select.js-country");
            $selectControl.empty();
            // default value
            $selectControl.append($("<option/>", {
                value: '',
                text: $selectControl.data('placeholder')
            }));
            $.each(settings.countries, function (index, item) {
                $selectControl.append($("<option/>", {
                    value: item,
                    text: item
                }));
            });
            $selectControl.trigger("refresh");
            // hack for width
            $selectControl.siblings(".jq-selectbox__dropdown").css("width", "");
        }

        function bindStoreDdl(country) {
            var $selectControl = $("select.js-store");
            $selectControl.empty();
            // default value
            $selectControl.append($("<option/>", {
                value: '',
                text: $selectControl.data('placeholder')
            }));
            $.each(settings.stores, function (index, item) {
                if (!country || country === '' || $.inArray(country, item.countryList) >= 0) {
                    $selectControl.append($("<option/>", {
                        value: item.id,
                        text: item.storeName
                    }));
                }
            });
            $selectControl.trigger("refresh");
            // hack for width
            $selectControl.siblings(".jq-selectbox__dropdown").css("width", "");
        }

        function loadFilterSettings() {
            $.ajax({
                url: moduleOptions.locatorSettingsUrl,
                datatype: "json",
                type: "GET",
                success: function (data, xhr, options) {
                    settings.stores = data.storeSettings;
                    settings.countries = data.countrySettings;
                    console.log("countries: ");
                    console.log(data.countrySettings);
                    bindCountryDdl();
                    bindStoreDdl(null);
                }
            });
        }

        function searchUserText() {
            var address = $(".js-location-search-text").val();
            if (address.length <= 0) {
                setCurrentLocation(moduleOptions.onLoadLat, moduleOptions.onLoadLng);
                searchLocations();
                return;
            }
            geocoder.geocode({ 'address': address }, function (results, status) {
                var place = results[0];
                if (status == google.maps.GeocoderStatus.OK && place.geometry) {
                    setCurrentLocation(place.geometry.location.lat(), place.geometry.location.lng());
                    searchLocations();
                } else {
                    var container = $(".js-loc-list");
                    container.empty();
                    var noResults = "<li>No results. Address not found as entered. Please check your address and try again.</>";
                    container.append(noResults);
                }
            });
        }

        function bindSearchFormHandlers() {
            // locationBtn
            $('#locationBtn').click(function() {
                searchUserText();
            });

            // checkboxes
            $.each(moduleOptions.availableProductCheckboxes, function (i, name) {
                $("#" + name).change(function() {
                    currentFilter[name] = $(this).is(':checked');
                    searchLocations();
                })
            });

            // country
            $('select.js-country').change(function () {
                var selected = $(this);
                currentFilter.country = selected.val();
                bindStoreDdl(currentFilter.country);
                // reset store value
                currentFilter.storeId = "";
                searchLocations();
            });

            // store
            $('select.js-store').change(function () {
                var selected = $(this);
                currentFilter.storeId = selected.val();
                searchLocations();
            });
        }

        function initializeGoogleMap() {
            var mapOptions = {
                center: new google.maps.LatLng(currentFilter.coordinates.latitude, currentFilter.coordinates.longitude),
                zoom: moduleOptions.onLoadZoom,
                scrollwheel: false,
                zoomControl: true,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: true,
                zoomControlOptions: {
                    style: google.maps.ZoomControlStyle.SMALL, position: google.maps.ControlPosition.TOP_LEFT
                }
            };

            var mapElement = document.getElementById("map");
            geocoder = new google.maps.Geocoder();
            map = new google.maps.Map(mapElement, mapOptions);

            initAutocomplete();
            bindSearchFormHandlers();
            bindMapScrollListeners();
        }

        function loadTemplates(infowindowTemplatePath, listTemplatePath) {
            //Infowindow
            var d1 = $.get(infowindowTemplatePath, function (template) {
                var source = template;
                source = source.replace("#website#", moduleOptions.translations.website);
                source = source.replace("#directions#", moduleOptions.translations.directions);
                infowindowTemplate = Handlebars.compile(source);
            });

            //Locations list
            var d2 = $.get(listTemplatePath, function (template) {
                var source = template;
                source = source.replace("#website#", moduleOptions.translations.website);
                source = source.replace("#directions#", moduleOptions.translations.directions);
                listTemplate = Handlebars.compile(source);
            });
            return $.when(d1, d2);
        }

        this.init = function (options) {
            $.extend(moduleOptions, options);

            loadFilterSettings();

            $.when(loadTemplates(moduleOptions.infoboxTemplatePath, moduleOptions.listTemplatePath))
            .then(function () {
                getUserGeoLocation();
            });
        };

        return this;
    };

    $.extend($.technogel, {
        storeLocator: new $.technogel.StoreLocator()
    });
})(jQuery);
