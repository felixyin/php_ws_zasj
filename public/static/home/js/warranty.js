$(document).ready(function ()
{
    var locations;

    var stateOfPurchaseId = "#c06c8e96-d728-45f7-9fe0-1472bb2dd25c";
    var retailerOfPurchaseId = "#ce9ba095-2aa6-4f1d-eda6-908bf8bfa6be";
    var placeOfPurchaseId = "#f0da284c-6dc8-499e-809c-6d5ad01a2de0";

    var form = $(stateOfPurchaseId).closest("form");
    var formId = form.find("input[name=FormId]").val();
    var formValues = JSON.parse(form.parent().parent().find("#values_" + formId.replace(/-/g, '')).val() || "{}");

    $(retailerOfPurchaseId).closest(".contourField").hide();
    $(placeOfPurchaseId).closest(".contourField").hide();

    // Chaged data piker date format
    $("#6847b923-e415-4a3d-ed58-2dfaeb9c8847").change(function ()
    {

        var currentDate = $(this).val();
        var timestamp = Date.parse(currentDate);
        if (!isNaN(timestamp))
        {
            var date = new Date(currentDate);
            var monthNumber = date.getMonth() + 1;
            var currentMonth = monthNumber >= 10 ? monthNumber : "0" + monthNumber;

            var currentDay = date.getDate();
            var dayNumber = currentDay >= 10 ? currentDay : "0" + currentDay;

            var formattedDate = currentMonth + "/" + dayNumber + "/" + date.getFullYear();
            $(this).val(formattedDate);
        }
    });

    function changePurchaseState(el) {
        $(retailerOfPurchaseId).closest(".contourField").show();
        $(placeOfPurchaseId).closest(".contourField").show();

        var stateName = $(stateOfPurchaseId).val().toLowerCase();
        var statePrefix = getStatePrefixByStateName(stateName);
        if (statePrefix === undefined) {
            statePrefix = stateName;
        }
        var stores = getStoresByStatePrefix(statePrefix);
        renderStoreNames(stores, el);
        removeStoreAddressesFromDropDown();


        var storeName = $(retailerOfPurchaseId + "-styler .jq-selectbox__select-text").text();
        var addresses = getStoreAddresses(statePrefix, storeName);
        renderStoreAddresses(addresses, el);
        addEventHandlerOnStoreNameChange();
    }

    // On state change
    $(stateOfPurchaseId).change(changePurchaseState);

    function addEventHandlerOnStoreNameChange()
    {
        // On store name change
        $(retailerOfPurchaseId).change(function ()
        {
            var stateName = $(stateOfPurchaseId + "-styler .jq-selectbox__select-text").text().toLowerCase();
            var statePrefix = getStatePrefixByStateName(stateName);
            if (statePrefix === undefined)
            {
                statePrefix = stateName;
            }
            var storeName = $(this).val();
            var addresses = getStoreAddresses(statePrefix, storeName);
            renderStoreAddresses(addresses, $(this));
        });
    }

    function getStatePrefixByStateName(stateName)
    {
        return stateArray[stateName];
    }

    function getStoresByStatePrefix(prefix)
    {
        var stores = [];
        $.each(locations, function (index, value)
        {
            if (value.state !== null)
            {
                var prefixState = value.state.toLowerCase();
                if (prefixState === prefix.toLowerCase())
                {
                    stores = stores.concat(value.stores);
                }
            }
        });

        return stores;
    }

    function getStoreAddresses(statePrefix, storeName)
    {
        var addresses = [];
        $.each(locations, function (index, value)
        {
            if (value.state !== null)
            {
                var prefixState = value.state.toLowerCase();
                if (prefixState === statePrefix.toLowerCase())
                {
                    var stores = value.stores;
                    $.each(stores, function (index, value)
                    {
                        var searchStoreName = value.storeName;
                        if (storeName === searchStoreName)
                        {
                            var data = value.data;
                            $.each(data, function (index, value)
                            {
                                addresses.push(value);
                            });
                        }
                    });
                }
            }
        });

        return addresses;
    }

    function removeStoreAddressesFromDropDown()
    {
        $(placeOfPurchaseId).empty(); //remove all child nodes
        var newOption = '<option value="Choose..."></option>';
        $(placeOfPurchaseId).append(newOption);
        $(placeOfPurchaseId).trigger('refresh');
    }

    function renderStoreNames(stores, el)
    {
        $(retailerOfPurchaseId).empty(); //remove all child nodes
        if (stores !== undefined)
        {
            $.each(stores, function (index, value)
            {
                var storeName = value.storeName;
                var newOption = '<option value="' + storeName + '">' + storeName + '</option>'
                $(retailerOfPurchaseId).append(newOption);
            });
        }
        var onlineStores = getOnlineStores();
        if (onlineStores) {
            $.each(onlineStores, function (index, value) {
                var storeName = value.storeName;
                var newOption = '<option value="' + storeName + '">' + storeName + '</option>'
                $(retailerOfPurchaseId).append(newOption);
            });
        }

        if (!el) $(retailerOfPurchaseId).val(formValues["ce9ba095-2aa6-4f1d-eda6-908bf8bfa6be"]);
        $(retailerOfPurchaseId).trigger('refresh');
    }

    function renderStoreAddresses(addresses, el)
    {
        $(placeOfPurchaseId).empty(); //remove all child nodes
        if (addresses.length > 0)
        {
            $.each(addresses, function (index, value)
            {
                var address = value.address;
                var newOption = '<option value="' + address + '">' + address + '</option>'
                $(placeOfPurchaseId).append(newOption);
            });
        }
        else
        {
            var onlineStoreAddresses = getOnlneStoreAddresses();
            if (onlineStoreAddresses.length > 0)
            {
                var newOption = '<option value="Online Store">Online Store</option>';
                $(placeOfPurchaseId).append(newOption);
            }
        }
        if (!el) $(placeOfPurchaseId).val(formValues["f0da284c-6dc8-499e-809c-6d5ad01a2de0"]);
        $(placeOfPurchaseId).trigger('refresh');
    }

    function getOnlineStores()
    {
        var stores;
        $.each(locations, function (index, value)
        {
            var prefixState = value.state;
            if (prefixState === null)
            {
                stores = value.stores;
            }
        });

        return stores;
    }

    function getOnlneStoreAddresses()
    {
        var addresses = [];
        $.each(locations, function (index, value)
        {
            var prefixState = value.state;
            if (prefixState === null)
            {
                var stores = value.stores;
                $.each(stores, function (index, value)
                {
                    var data = value.data;
                    $.each(data, function (index, value)
                    {
                        addresses.push(value);
                    });
                });
            }
        });

        return addresses;
	}


    var stateArray = new Array();
    stateArray['alabama'] = "AL";
    stateArray['alaska'] = "AK";
    stateArray['arizona'] = "AZ";
    stateArray['arkansas'] = "AR";
    stateArray['california'] = "CA";
    stateArray['colorado'] = "CO";
    stateArray['connecticut'] = "CT";
    stateArray['delaware'] = "DE";
    stateArray['florida'] = "FL";
    stateArray['georgia'] = "GA";
    stateArray['hawaii'] = "HI";
    stateArray['idaho'] = "ID";
    stateArray['illinois'] = "IL";
    stateArray['indiana'] = "IN";
    stateArray['iowa'] = "IA";
    stateArray['kansas'] = "KS";
    stateArray['kentucky'] = "KY";
    stateArray['louisiana'] = "LA";
    stateArray['maine'] = "ME";
    stateArray['maryland'] = "MD";
    stateArray['massachusetts'] = "MA";
    stateArray['michigan'] = "MI";
    stateArray['minnesota'] = "MN";
    stateArray['mississippi'] = "MS";
    stateArray['missouri'] = "MO";
    stateArray['montana'] = "MT";
    stateArray['nebraska'] = "NE";
    stateArray['nevada'] = "NV";
    stateArray['new hampshire'] = "NH";
    stateArray['new jersey'] = "NJ";
    stateArray['new mexico'] = "NM";
    stateArray['new york'] = "NY";
    stateArray['north carolina'] = "NC";
    stateArray['north dakota'] = "ND";
    stateArray['ohio'] = "OH";
    stateArray['oklahoma'] = "OK";
    stateArray['oregon'] = "OR";
    stateArray['pennsylvania'] = "PA";
    stateArray['rhode island'] = "RI";
    stateArray['south carolina'] = "SC";
    stateArray['south dakota'] = "SD";
    stateArray['tennessee'] = "TN";
    stateArray['texas'] = "TX";
    stateArray['utah'] = "UT";
    stateArray['vermont'] = "VT";
    stateArray['virginia'] = "VA";
    stateArray['washington'] = "WA";
    stateArray['west virginia'] = "WV";
    stateArray['wisconsin'] = "WI";
    stateArray['wyoming'] = "WY";
    // Canada
    stateArray['alberta'] = "AB";
    stateArray['british columbia'] = "BC";
    stateArray['manitoba'] = "MB";
    stateArray['new brunswick'] = "NB";
    stateArray['newfoundland and labrador'] = "NL";
    stateArray['newfoundland'] = "NL";
    stateArray['labrador'] = "NL";
    stateArray['north west territory'] = "NT";
    stateArray['northwest territories'] = "NT";
    stateArray['nova scotia'] = "NS";
    stateArray['nunavut'] = "NU";
    stateArray['ontario'] = "ON";
    stateArray['prince edward island'] = "PE";
    stateArray['quebec'] = "QC";
    stateArray['saskatchewan'] = "SK";
    stateArray['yukon'] = "YT";
    stateArray['yukon territory'] = "YT";

    $.ajax({
        type: "GET",
        url: "/umbraco/surface/stores/GetPurchaseItems?countries=USA,Canada",
        dataType: "json",
        success: function (data, xhr, options)
        {
            locations = data;
            $.each(locations, function (index, value) {
                if (value.state !== null) {
                    var statePrefix = getStatePrefixByStateName(value.state.toLowerCase());
                    if (statePrefix !== undefined) {
                        value.state = statePrefix;
                    }
                }
            });

            // if postback then pre-fill
            if ($(stateOfPurchaseId).val()) changePurchaseState();
        }
    });

});