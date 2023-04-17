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
    $scope.TextareaDiv = true;
    $scope.AnswerDiv = true;

    Office.onReady(function () {





        ///////////// Get All Document Content //////////////
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




            Office.context.document.getFilePropertiesAsync(function (asyncResult) {
                var fileUrl = asyncResult.value.url;
                if (fileUrl == "") {
                    //console.log("The file hasn't been saved yet. Save the file and try again");
                    $scope.FileName = "Unsaved Document";
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

        function isValidHttpUrl(string) {
            let url;
            try {
                url = new URL(string);
            } catch (_) {
                return false;
            }
            return url.protocol === "http:" || url.protocol === "https:";
        };


        Office.context.document.addHandlerAsync(Office.EventType.DocumentSelectionChanged, handler);

        function handler(evtArgs) {
            Word.run(function (context) {
                var range = context.document.getSelection(); // Create a range proxy object for the current selection.
                context.load(range);
              //  $scope.SelctedTExt = undefined;

                // Synchronize the document state by executing the queued commands,and return a promise to indicate task completion.
                return context.sync().then(function () {
                    if (range.isEmpty) {
                        console.log("No Selected");
                        if (!$scope.$$phase) {
                            $scope.$apply();
                        };
                    } else {

                        console.log(range.text);
                        if (range.text) {
                            $scope.SelctedText = undefined;
                            $scope.TextareaDiv = true;
                            $scope.AnswerDiv = true;
                            
                            conversationPreparation(range.text)
                        };

                        if (!$scope.$$phase) {
                            $scope.$apply();
                        };
                    }
                });
            });
        };

       

        


        /////////////////// Fetch Citations ////////////////////
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
                    }
                }
                if (error.status == 400) {
                    loadToast(error.responseText);
                }
                ProgressLinearInActive();
            });

        };




        //////////////////// Select Citation ////////////////////
        $scope.selectCitation = function () {
            //  console.log($scope.SelectedCitations);

            Office.context.document.getSelectedDataAsync(Office.CoercionType.Text, function (asyncResult) {
                if (asyncResult.status == Office.AsyncResultStatus.Failed) {
                    console.log('Action failed. Error: ' + asyncResult.error.message);
                }
                else {
                    console.log('Selected data: ' + asyncResult.value);
                    if (asyncResult.value) {
                        conversationPreparation(asyncResult.value);
                    };
                }
            });

        };





        //////////////////////// PreparationConservation ///////////////////////
        var activeQuestion;
        function conversationPreparation(SelText) {
            if (SelText) {
                if ($scope.SelectedCitations) {
                    ProgressLinearActive();
                    $scope.Questine = undefined;
                    $scope.answerRes = undefined;
                    var settings = {
                        "url": "https://patdoc.net/api/chat/v1/defaultConversation",
                        "method": "POST",
                        "timeout": 0,
                        "headers": {
                            "API-KEY": APIKey,
                            "Content-Type": "application/json"
                        },
                        "data": JSON.stringify({
                            "applicationNumber": $scope.PatentAppNumber,
                            "citation": {
                                "id": $scope.SelectedCitations.id,
                                "name": $scope.SelectedCitations.name
                            },
                            "searchTerm": SelText
                        }),
                    };

                    $.ajax(settings).done(function (response) {
                        console.log(response);
                        activeQuestion = response;
                        for (let i = 0; i < response.length; i++) {
                            if (response[i].visible === true) {
                                $scope.Questine = response[i].message;
                                $scope.SelctedText = response[i].message;
                            }
                        };
                        $scope.TextareaDiv = false;
                        ScrollDown("CitationsResult");

                        ProgressLinearInActive();

                        if (!$scope.$$phase) {
                            $scope.$apply();
                        };

                    }).fail(function (error) {
                        console.log(error);
                        ProgressLinearInActive();
                        loadToast("Request Failed");
                    });


                } else {
                    loadToast("Citations is not selected.");
                };


            } else {
                loadToast("Text is not selected.")
            };
        };




        ///////////////////////// Ask ChatGPT ///////////////////////////

        $scope.askChatGPT = function () {
            ProgressLinearActive();
            var settings = {
                "url": "https://patdoc.net/api/chat/v1/converse",
                "method": "POST",
                "timeout": 0,
                "headers": {
                    "API-KEY": APIKey,
                    "Content-Type": "application/json"
                },
                "data": JSON.stringify(activeQuestion),
            };

            $.ajax(settings).done(function (response) {
                console.log(response);
                $scope.AnswerDiv = false;

                for (let i = 0; i < response.length; i++) {
                    if (response[i].user === "assistant") {
                        $scope.answerRes = response[i].message;
                        $scope.CreateCommont(response[i].message);

                    };
                };
                ScrollDown("ConservationDiv");

                ProgressLinearInActive();
                if (!$scope.$$phase) {
                    $scope.$apply();
                };
            }).fail(function (error) {
                console.log(error);
                ProgressLinearInActive();
                loadToast("Request Failed");
            });


        };




        

        //// Link to full sample: https://raw.githubusercontent.com/OfficeDev/office-js-snippets/prod/samples/word/50-document/manage-comments.yaml
        //// Reply to the first active comment in the selected content.
        //await Word.run(async (context) => {
        //    const text = $("#reply-text")
        //        .val()
        //        .toString();
        //    const comments = context.document.getSelection().getComments();
        //    comments.load("items");
        //    await context.sync();
        //    const firstActiveComment = comments.items.find((item) => item.resolved !== true);
        //    if (firstActiveComment) {
        //        const reply = firstActiveComment.reply(text);
        //        console.log("Reply added");
        //    } else {
        //        console.log("No active comment was found in the selection so couldn't reply.");
        //    }
        //});


       function ScrollDown(effectedId) {

                $('html,body').animate({
                    scrollTop: $("#" + effectedId).offset().top
                },'slow');
         
        }


        $scope.CreateCommont = function (text) {

            // Link to full sample: https://raw.githubusercontent.com/OfficeDev/office-js-snippets/prod/samples/word/50-document/manage-comments.yaml
            // Set a comment on the selected content.
             Word.run(function (context){
            
                const comment = context.document.getSelection().insertComment(text);

                // Load object for display in Script Lab console.
                comment.load();
                 return context.sync()
                     .then(function () {
                         console.log("Comment inserted:");
                         console.log(comment);
                     });

               
            });




            //Word.run(function (context) {
            //    let range = context.document.getSelection();
            //    context.sync();
            //    var TextForComment = text;
            //    range.insertOoxml(
            //       // '<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage"><pkg:part pkg:name="/_rels/.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="512" ><pkg:xmlData ><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" ><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml" /></Relationships></pkg:xmlData ></pkg:part><pkg:part pkg:name="/word/_rels/document.xml.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="256"><pkg:xmlData><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml" xmlns="http://schemas.openxmlformats.org/package/2006/relationships" /></Relationships></pkg:xmlData></pkg:part><pkg:part xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage" pkg:name="/word/comments.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"><pkg:xmlData><w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:comment xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:id="0"><w:p><w:r><w:t>' + TextForComment + '</w:t></w:r></w:p></w:comment></w:comments></pkg:xmlData></pkg:part><pkg:part pkg:name="/word/_rels/comments.xml.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml"><pkg:xmlData><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships></pkg:xmlData></pkg:part></pkg:package>',
            //        '<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage"><pkg:part pkg:name="/_rels/.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="512" ><pkg:xmlData ><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" ><Relationship Id="rId1" Type = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml" /></Relationships></pkg:xmlData ></pkg:part><pkg:part pkg:name="/word/_rels/document.xml.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="256"><pkg:xmlData><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml" xmlns="http://schemas.openxmlformats.org/package/2006/relationships" /></Relationships></pkg:xmlData></pkg:part><pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"><pkg:xmlData><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:commentRangeStart w:id="0"/><w:r><w:t>' + $scope.SelctedText + '</w:t></w:r><w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r></w:p></w:body></w:document></pkg:xmlData></pkg:part><pkg:part xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage" pkg:name="/word/comments.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"><pkg:xmlData><w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:comment xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" w:id="0"><w:p><w:r><w:t>' + TextForComment + '</w:t></w:r></w:p></w:comment></w:comments></pkg:xmlData></pkg:part><pkg:part pkg:name="/word/_rels/comments.xml.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml"><pkg:xmlData><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships></pkg:xmlData></pkg:part></pkg:package>',
            //        "Replace"
            //    );
                
            //    context.sync();
            //});
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