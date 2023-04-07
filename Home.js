var app = angular.module('PatentMakerApp', ['ngMaterial'], function ($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('blue', {
            'default': '500', // by default use shade 400 from the pink palette for primary intentions //

        });
});
app.controller('PatentMakerCtrl', function ($scope, $mdToast, $log) {

    ProgressLinearActive();

    var APIKey = "108D6AFC-B689-4142-BB54-D5910BA433CF";

    $scope.Citations = [];

    Office.onReady(function () {


        ///////////////
            Office.context.document.getFilePropertiesAsync(function (asyncResult) {
                var fileUrl = asyncResult.value.url;
                if (fileUrl == "") {
                    //console.log("The file hasn't been saved yet. Save the file and try again");
                    loadToast("The file hasn't been saved yet. Save the file and try again Failed");
                }
                else {
                    var checkIsUrl = isValidHttpUrl(fileUrl);
                    if (checkIsUrl) {
                        $scope.FileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
                        console.log($scope.FileName);
                    }
                    else {
                        const pathComponents = fileUrl.split('\\');
                        $scope.FileName = pathComponents.pop();
                        console.log($scope.FileName);
                    };
                };
            });

            ///////////// Check Path String //////////////
        function isValidHttpUrl(string) {
            let url;
            try {
                url = new URL(string);
            } catch (_) {
                return false;
            }
            return url.protocol === "http:" || url.protocol === "https:";
        };

        /////////////////////  Get All Content of document /////////////////////////
        Word.run(function (context) {
            // Get the body, header, and footer objects //
            var documentHeader = context.document.sections.getFirst().getHeader("primary");
            var documentBody = context.document.body;
            var documentFooter = context.document.sections.getFirst().getFooter("primary");

            // Load the body, header, and footer objects //
            context.load(documentHeader);
            context.load(documentBody);
            context.load(documentFooter);

            return context.sync()
                .then(function () {
                   console.log(documentHeader.text);
                   console.log(documentBody.text);
                   console.log(documentFooter.text);
                   $scope.headerText = documentHeader.text;
                   $scope.bodyText = documentBody.text;
                   $scope.footerText = documentFooter.text;

                    var allText = $scope.headerText + " " + $scope.bodyText + " " + $scope.footerText;

                    var pattern = /EP[\d\s\.]+/g;  
                    var matches = allText.match(pattern);
                    if (matches) {
                        console.log(matches);
                        console.log(matches[1]);
                        $('#applicationNumber').focus();
                        $scope.PatentAppNumber = matches[0].replace(/\s/g, "");
                    } else {
                        console.log("Not Found");
                    };
                });
        });

        ///////////////////////// Fetch Citations /////////////////////////
        $scope.FetchCitations = function () {
            ProgressLinearActive();
            $scope.Citations = [];
            var settings = {
                "url": "https://patdoc.net/api/chat/v1/citations?applicationNumber=" + $scope.PatentAppNumber,
                "method": "GET",
                "timeout": 0,
                "headers": {
                    "API-KEY": APIKey
                },
            };

            $.ajax(settings).done(function (response) {
                console.log(response);
                $scope.Citations = response;

                if (!$scope.$$phase) {
                    $scope.$apply();
                };
                ProgressLinearInActive();
            }).fail(function (error) {
                console.log(error)
                if (error.status == 404) {
                    if (error.responseJSON.title === "Not Found") {
                        loadToast("Not Found");
                    };
                } else if (error.status == 400) {
                    loadToast(error.responseText);
                } else {
                    loadToast("Request Failed");
                }
                ProgressLinearInActive();
            });

        };

        ProgressLinearInActive();
    });
  
    ///////////////////// Loader /////////////////////
    function ProgressLinearActive() {
        $("#StartProgressLinear").show(function () {
            $("#ProgressBgDiv").show();
            $scope.ddeterminateValue = 15;
            $scope.showProgressLinear = false;
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        });
    };
    function ProgressLinearInActive() {
        $("#StartProgressLinear").hide(function () {
            setTimeout(function () {
                $scope.ddeterminateValue = 0;
                $scope.showProgressLinear = true;
                $("#ProgressBgDiv").hide();
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            }, 500);
        });
    };
    ///////////////////// Toast for Message /////////////////////
    function loadToast(alertMessage) {
        var el = document.querySelectorAll('#zoom');
        $mdToast.show(
            $mdToast.simple()
                .textContent(alertMessage)
                .position('bottom')
                .hideDelay(4000))
            .then(function () {
                $log.log('Toast dismissed.');
            }).catch(function () {
                $log.log('Toast failed or was forced to close early by another toast.');
            });
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    };

    if (!$scope.$$phase) {
        $scope.$apply();
    }

});