Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {
        //API Docs: https://help.rallydev.com/apps/2.1/doc/    
        var context = this.getContext();
        var project = context.getProject()['ObjectID'];
        //var project = 90681998188;

        var initDate = '';
        var endDate = '';

        //global releases ids
        this.iterations = [];

        var baseIterationName = '';
        var baseIterationId = '';

        console.log('project: ', project);
        var that = this;

        var initDatePicker = Ext.create('Ext.form.field.Date', {
            fieldLabel: 'From:',
            listeners: {
                select: function(picker, date) {
                    //console.log(date);
                    initDate = date.toISOString();
                }
            }
        });

        var endDatePicker = Ext.create('Ext.form.field.Date', {
            fieldLabel: 'To:',
            listeners: {
                select: function(picker, date) {
                    //console.log(date);
                    endDate = date.toISOString();
                }
            }
        });

        var iterationComboBox = Ext.create('Rally.ui.combobox.IterationComboBox', {
            itemId: 'iterationComboBox',
            //allowClear: true,
            scope: this,
            listeners: {
                ready: function(combobox) {
                    baseIterationId = combobox.getRecord().get('ObjectID');
                    baseIterationName = combobox.getRecord().get('Name');
                },
                select: function(combobox, records, opts) {
                    baseIterationId = combobox.getRecord().get('ObjectID');
                    baseIterationName = combobox.getRecord().get('Name');
                }
            }

        });

        var defectsCheckBox = Ext.create('Ext.form.field.Checkbox' ,{
            boxLabel  : 'Include Defects?',
            name      : 'defects',
            inputValue: 'defects',
            margin: '10 10 10 100',
            id        : 'defectsCheckBox'
        });

        var searchButton = Ext.create('Rally.ui.Button', {
            text: 'Search',
            margin: '10 10 10 100',
            scope: this,
            handler: function() {
                //handles search
                //console.log(initDate, endDate);
                this._doSearch(initDate, endDate, project, baseIterationName, baseIterationId);
            }
        });


        var datePanel = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            align: 'stretch',
            padding: 5,
            itemId: 'datePanel',
            items: [{
                xtype: 'panel',
                flex: 1,
                itemId: 'filterPanel'
            }, {
                xtype: 'panel',
                flex: 1,
                itemId: 'tooltipPanel'
            }]
        });


        var summaryPanel = Ext.create('Ext.panel.Panel', {
            title: 'Summary',
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 5
            },
            padding: 5,
            itemId: 'summaryPanel',
        });

        var mainPanel = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            padding: 5,
            itemId: 'parentPanel',
            items: [{
                xtype: 'panel',
                title: 'Stories and Defects at Start Date',
                flex: 1,
                itemId: 'childPanel1'
            }, {
                xtype: 'splitter'
            }, {
                xtype: 'panel',
                title: 'Stories and Defects at End Date',
                flex: 1,
                itemId: 'childPanel2'
            }]
        });


        this.myMask = new Ext.LoadMask({
            msg: 'Please wait...',
            target: mainPanel
        });


        this.add(datePanel);
        datePanel.down('#filterPanel').add(initDatePicker);
        datePanel.down('#filterPanel').add(endDatePicker);
        datePanel.down('#filterPanel').add(iterationComboBox);
        datePanel.down('#filterPanel').add(defectsCheckBox);
        datePanel.down('#filterPanel').add(searchButton);

        datePanel.down('#tooltipPanel').add({
            id: 'tooltipContent1',
            padding: 5,
            height: 45,
            overflowX: 'auto',
            overflowY: 'auto',
            html: '<div style= "clear:both">' +
                '<div style="background-color:#cdf9c2; width:20px; height:20px; margin:5px; float:left;"></div>' +
                '<div style="height:20px; margin:5px; float:left;">Stories and Defects present at start date and at the end date with state <b>Accepted</b> or <b>Ready to Ship</b>.</div>' +
                '</div>'
        }, {
            id: 'tooltipContent2',
            padding: 5,
            height: 45,
            overflowX: 'auto',
            overflowY: 'auto',
            html: '<div style= "clear:both">' +
                '<div style="background-color:#c2d7f9; width:20px; height:20px; margin:5px; float:left;"></div>' +
                '<div style="height:20px; margin:5px; float:left;">Stories and Defects absent at the start date and present at end date.</div>' +
                '</div>'
        }, {
            id: 'tooltipContent3',
            padding: 5,
            height: 45,
            overflowX: 'auto',
            overflowY: 'auto',
            html: '<div style= "clear:both">' +
                '<div style="background-color:#ffe2e2; width:20px; height:20px; margin:5px; float:left;"></div>' +
                '<div style="height:20px; margin:5px; float:left;">Stories and Defects present at the start date, but absent at end date.</div>' +
                '</div>'
        });

        this.add(summaryPanel);
        this.add(mainPanel);

    },

    _includeDefects: function() {
        return Ext.getCmp('defectsCheckBox').checked;
    },

    _doSearch: function(initDate, endDate, projectId, baseIterationName, baseIterationId) {
        //gather all releases 
        console.log('parent iteration name: ', baseIterationName);
        console.log('looking for:', initDate, endDate, projectId);

        console.log('Defects: ', this._includeDefects());


        if (initDate == '' || endDate == '') {
            return;
        }

        this.myMask.show();

        //clear relase filter:
        this.iterations = [];


        //this recovers all iterations from a parent project given the iteration name.
        Ext.create('Rally.data.wsapi.Store', {
            model: 'Iteration',
            autoLoad: true,
            context: {
                projectScopeUp: false,
                projectScopeDown: true,
                project: null //null to search all workspace
            },


            filters: Rally.data.QueryFilter.or([

                Rally.data.QueryFilter.and([{
                    property: 'Project.parent.ObjectID',
                    value: projectId
                }, {
                    property: 'name',
                    value: baseIterationName
                }]),

                Rally.data.QueryFilter.and([{
                    property: 'Project.parent.parent.ObjectID',
                    value: projectId
                }, {
                    property: 'name',
                    value: baseIterationName
                }])
            ]),

            listeners: {
                load: function(store, data, success) {
                    //console.log('Store:', store);
                    //console.log('Data:', data);

                    //this checks if the project is a leaf. 
                    //will return 0 child releases if so. else will return all releases id.
                    if (data.length > 0) {
                        //console.log('multiple iterations found:', data);
                        var localIterations = [];

                        _.each(data, function(record) {
                            localIterations.push(record.get('ObjectID'));
                        });

                        this.iterations = localIterations;
                        console.log('iterations: ', this.iterations);
                    } else {
                        console.log('single iteration found, using baseIterationId:', baseIterationId);
                        this.iterations = [baseIterationId];
                    }

                    var typeHierachy;
                    if (this._includeDefects()) {
                        typeHierachy = ['HierarchicalRequirement', 'Defect'];
                    } else {
                        typeHierachy = ['HierarchicalRequirement'];
                    }

                    this.filtersInit = [{
                            property: '__At',
                            value: initDate
                        },

                        {
                            property: '_TypeHierarchy',
                            operator: 'in',
                            value: typeHierachy
                        }, {
                            property: '_ProjectHierarchy',
                            value: projectId
                        },

                        {
                            property: 'Iteration',
                            operator: 'in',
                            value: this.iterations
                            //value: iterationId
                        }
                    ];

                    this.filtersEnd = [{
                            property: '__At',
                            value: endDate
                        },

                        {
                            property: '_TypeHierarchy',
                            operator: 'in',
                            value: typeHierachy
                        }, {
                            property: '_ProjectHierarchy',
                            value: projectId
                        }, {
                            property: 'Iteration',
                            operator: 'in',
                            value: this.iterations
                        }
                    ];

                    this._loadInitData();
                },
                scope: this
            },
            fetch: ['Description', 'Name', 'ObjectID'],
            limit: Infinity
        });
    },

    _loadInitData: function() {
        console.log('loading init stories');
        //console.log('filters:', this.filtersInit);
        var store = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch: ['Name', 'FormattedID', 'PlanEstimate', 'State', 'ScheduleState', 'PortfolioItem', 'Parent', "_ValidFrom", "_ValidTo", "TestCase"],
            filters: this.filtersInit,
            limit: Infinity,
            autoLoad: true,
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            }],

            hydrate: ['State', 'ScheduleState'],

            listeners: {
                load: function(store, data, success) {
                    console.log('Init Store', store);
                    this.initItems = data;
                    this._loadEndData();
                },
                scope: this
            }
        });
    },

    _loadEndData: function() {
        console.log('loading end stories');
        var store2 = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch: ['Name', 'FormattedID', 'PlanEstimate', 'State', 'ScheduleState', 'PortfolioItem', 'Parent', "_ValidFrom", "_ValidTo", "TestCase"],
            filters: this.filtersEnd,
            limit: Infinity,
            autoLoad: true,
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            }],

            hydrate: ['State', 'ScheduleState'],

            listeners: {
                load: function(store, data, success) {
                    this.endItems = data;
                    this._onStoriesLoaded();
                    this.myMask.hide();
                },
                scope: this
            }
        });
    },

    //make grid of stories 
    _onStoriesLoaded: function() {
        var that = this;
        var initFeatures = [];
        var endFeatures = [];
        var initIds = [];
        var endIds = [];
        var id;

        var parentIds = [];

        var testCaseIds = [];

        _.each(this.initItems, function(record) {
            initIds.push(record.get('ObjectID'));

            var parent;
            if (record.get('PortfolioItem') != "") {
                parent = record.get('PortfolioItem');
            } else if (record.get('Parent') != "") {
                parent = record.get('Parent');
            }

            var testCaseId;
            if (record.get('TestCase') != "") {
                testCaseId = record.get('TestCase');
            }

            if (parent && !Ext.Array.contains(parentIds, parent)) {
                parentIds.push(parent);
            }

            if (testCaseId && !Ext.Array.contains(testCaseIds, testCaseId)) {
                testCaseIds.push(testCaseId);
            }
        });
        //console.log('initIds', initIds);

        _.each(this.endItems, function(record) {
            endIds.push(record.get('ObjectID'));

            var parent;
            if (record.get('PortfolioItem') != "") {
                parent = record.get('PortfolioItem');
            } else if (record.get('Parent') != "") {
                parent = record.get('Parent');
            }

            var testCaseId;
            if (record.get('TestCase') != "") {
                testCaseId = record.get('TestCase');
            }

            if (parent && !Ext.Array.contains(parentIds, parent)) {
                parentIds.push(parent);
            }

            if (testCaseId && !Ext.Array.contains(testCaseIds, testCaseId)) {
                testCaseIds.push(testCaseId);
            }
        });
        //console.log('endIds', endIds);       

        var promise = this._loadParentNames(parentIds);
        var promiseTestCases = this._loadTestCaseNames(testCaseIds);

        Deft.Promise.all([promise, promiseTestCases]).then({
            success: function(records) {
                var parentNames = records[0];
                var testCaseNames = records[1];
                //console.log('sync call finished: ', parentNames);
                //find features not planned / items on endItems that were not included in initItems

                _.each(this.endItems, function(record) {
                    var id = record.get('ObjectID');
                    var state = record.get('ScheduleState');

                    var planned = true;
                    var completed = false;

                    //console.log('checking if', id, 'exists in', initIds);
                    if (!Ext.Array.contains(initIds, id)) {
                        planned = false;                        
                    }

                    if (state == 'Accepted' || state == 'Ready to Ship') {
                        completed = true;
                    }

                    var refUrl;
                    if (record.get('FormattedID').startsWith('D')) {
                        refUrl = '/defect/' + id;
                    } else {
                        refUrl = '/userstory/' + id;
                    }

                    var parent;
                    if (record.get('FormattedID').startsWith('D')) {
                        parent = testCaseNames.get(record.get('TestCase'));
                    } else {
                        parent = parentNames.get(record.get('PortfolioItem') == "" ? record.get('Parent') : record.get('PortfolioItem'));
                    }

                    endFeatures.push({
                        _ref: refUrl,
                        Name: record.get('Name'),
                        FormattedID: record.get('FormattedID'),
                        State: record.get('ScheduleState'),
                        Planned: planned,
                        Parent: parent,
                        Completed: completed,
                        PlanEstimate: record.get('PlanEstimate')

                    });
                }, this);


                //find feature that were not delivered / items on initItems that were not included in endItems.
                _.each(this.initItems, function(record) {
                    id = record.get('ObjectID');
                    var removed = false;

                    //console.log('checking if', id, 'exists in', endIds);
                    if (!Ext.Array.contains(endIds, id)) {
                        removed = true;
                    }

                    var parent;
                    if (record.get('FormattedID').startsWith('D')) {
                        parent = testCaseNames.get(record.get('TestCase'));
                    } else {
                        parent = parentNames.get(record.get('PortfolioItem') == "" ? record.get('Parent') : record.get('PortfolioItem'));
                    }

                    initFeatures.push({
                        _ref: '/userstory/' + id,
                        Name: record.get('Name'),
                        FormattedID: record.get('FormattedID'),
                        State: record.get('ScheduleState'),
                        Parent: parent,
                        Removed: removed,
                        PlanEstimate: record.get('PlanEstimate')

                    });
                }, this);


                var initStore = Ext.create('Rally.data.custom.Store', {
                    data: initFeatures,
                    pageSize: 1000
                });

                var endStore = Ext.create('Rally.data.custom.Store', {
                    data: endFeatures,
                    pageSize: 1000
                });

                this._createSummaryData(initFeatures, endFeatures);
                this._createInitGrid(initStore, '#childPanel1');
                this._createEndGrid(endStore, '#childPanel2');
            },
            failure: function(error) {
                console.log('error:', error);
            },
            scope: this
        });
    },

    _loadParentNames: function(parentIds) {
        var parentNames = new Ext.util.MixedCollection();
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['PortfolioItem/Feature', 'UserStory'],
            fetch: ['Name'],
            limit: Infinity,
            context: {
                projectScopeUp: false,
                projectScopeDown: true,
                project: null //null to search all workspace
            },
            filters: [{
                property: 'ObjectID',
                operator: 'in',
                value: parentIds
            }]
        }).load({
            callback: function(records, operation, success) {
                if (success) {
                    _.each(records, function(record) {
                        parentNames.add(record.get('ObjectID'), record.get('Name'));
                    });

                    //console.log(parentNames);
                    deferred.resolve(parentNames);
                } else {
                    deferred.reject("Error loading parents.");
                }
            }
        });

        return deferred.promise;
    },


    _loadTestCaseNames: function(testCaseIds) {
        var deferred = Ext.create('Deft.Deferred');
        if (!this._includeDefects()) {
            deferred.resolve();
            return deferred.promise;
        } 

        var testCaseNames = new Ext.util.MixedCollection();

        Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['TestCase'],
            fetch: ['Name'],
            limit: Infinity,
            context: {
                projectScopeUp: false,
                projectScopeDown: true,
                project: null //null to search all workspace
            },
            filters: [{
                property: 'ObjectID',
                operator: 'in',
                value: testCaseIds
            }]
        }).load({
            callback: function(records, operation, success) {
                if (success) {
                    _.each(records, function(record) {
                        testCaseNames.add(record.get('ObjectID'), record.get('Name'));
                    });

                    deferred.resolve(testCaseNames);
                } else {
                    deferred.reject("Error loading testCase names.");
                }
            }
        });

        return deferred.promise;
    },


    _createInitGrid: function(myStore, panel) {
        var grid = Ext.create('Rally.ui.grid.Grid', {
            showRowActionsColumn: false,
            showPagingToolbar: false,
            enableEditing: false,
            itemId: '' + panel + 'Grid',
            store: myStore,

            columnCfgs: [{
                xtype: 'templatecolumn',
                text: 'ID #',
                dataIndex: 'FormattedID',
                tdCls: 'x-change-cell',
                tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
            }, {
                text: 'Name',
                dataIndex: 'Name',
                flex: 1,
                tdCls: 'x-change-cell'
            }, {
                text: 'Parent',
                dataIndex: 'Parent',
                flex: 1,
                tdCls: 'x-change-cell'
            }, {
                text: 'Plan Estimate',
                dataIndex: 'PlanEstimate',
                tdCls: 'x-change-cell'
            }, {
                text: 'Schedule State',
                dataIndex: 'State',
                tdCls: 'x-change-cell'
            }],

            viewConfig: {
                getRowClass: function(record, rowIndex, rowParams, store) {
                    if (record.get('Removed') == true) {
                        //console.log('changing css for records', record, 'index', rowIndex);
                        return 'attention';
                    }
                }
            }
        });

        this.add(grid);
        var gridHolder = this.down(panel);
        gridHolder.removeAll(true);
        gridHolder.add(grid);
    },

    _createEndGrid: function(myStore, panel) {
        var grid = Ext.create('Rally.ui.grid.Grid', {
            showRowActionsColumn: false,
            showPagingToolbar: false,
            enableEditing: false,
            itemId: '' + panel + 'Grid',
            id: '' + panel + 'Grid',
            store: myStore,
            columnCfgs: [{
                xtype: 'templatecolumn',
                text: 'ID #',
                dataIndex: 'FormattedID',
                tdCls: 'x-change-cell',
                tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
            }, {
                text: 'Name',
                dataIndex: 'Name',
                flex: 1,
                tdCls: 'x-change-cell'
            }, {
                text: 'Parent',
                dataIndex: 'Parent',
                flex: 1,
                tdCls: 'x-change-cell'
            }, {
                text: 'Plan Estimate',
                dataIndex: 'PlanEstimate',
                tdCls: 'x-change-cell'
            }, {
                text: 'State',
                dataIndex: 'State',
                tdCls: 'x-change-cell'
            }],
            viewConfig: {
                getRowClass: function(record, rowIndex, rowParams, store) {
                    if (record.get('Planned') == false) {
                        //console.log('changing css for records', record, 'index', rowIndex);
                        return 'new-feature';
                    }
                    if (record.get('Completed') == true) {
                        return 'completed';
                    }
                }
            }
        });

        var gridHolder = this.down(panel);
        gridHolder.removeAll(true);
        gridHolder.add(grid);
    },


    _createSummaryData: function(initItems, endItems) {
        var totalCount = 0;
        var totalEstimate = 0;
        var totalCountRemoved = 0;
        var totalEstimateRemoved = 0;

        var totalCountEnd = 0;
        var totalEstimateEnd = 0;
        var totalCountAdded = 0;
        var totalEstimateAdded = 0;
        var totalCountCompleted = 0;
        var totalEstimateCompleted = 0;
        var totalCountNotCompleted = 0;
        var totalEstimateNotCompleted = 0;

        _.each(initItems, function(record) {
            totalCount += 1;
            totalEstimate += record['PlanEstimate'];

            if (record['Removed']) {
                totalCountRemoved += 1;
                totalEstimateRemoved += record['PlanEstimate'];
            }
        });

        _.each(endItems, function(record) {
            totalCountEnd += 1;            
            totalEstimateEnd += record['PlanEstimate'];

            if (!record['Planned']) {
                totalCountAdded += 1;                
                totalEstimateAdded += record['PlanEstimate'];
            }

            if (record['State'] == 'Accepted' || record['Ready to Ship'] == 'Done') {
                totalCountCompleted += 1;            
                totalEstimateCompleted += record['PlanEstimate'];
            }


            if (record['State'] != 'Accepted' && record['Ready to Ship'] != 'Done') {
                totalCountNotCompleted += 1;
                totalEstimateNotCompleted += record['PlanEstimate'];
            }
        });

        var data = [];
        data.push({
            totalCount: totalCount,
            totalEstimate: totalEstimate,
            totalCountRemoved: totalCountRemoved,
            totalEstimateRemoved: totalEstimateRemoved,

            totalCountEnd: totalCountEnd,
            totalEstimateEnd: totalEstimateEnd,
            totalCountAdded: totalCountAdded,
            totalEstimateAdded: totalEstimateAdded,
            totalCountCompleted: totalCountCompleted,
            totalEstimateCompleted: totalEstimateCompleted,
            totalCountNotCompleted: totalCountNotCompleted,
            totalEstimateNotCompleted: totalEstimateNotCompleted
        });

        var summaryStore = Ext.create('Ext.data.JsonStore', {
            fields: ['totalCount', 
            'totalEstimate',
            'totalCountRemoved', 
            'totalEstimateRemoved',

            'totalCountEnd',
            'totalEstimateEnd',
            'totalCountAdded', 
            'totalEstimateAdded',
            'totalCountCompleted',
            'totalEstimateCompleted',
            'totalCountNotCompleted',
            'totalEstimateNotCompleted']
        });

        summaryStore.loadData(data);
        this._createSummaryGrid(summaryStore);
    },


    _createSummaryGrid: function(summaryStore) {
        var summaryGrid = Ext.create('Ext.grid.Panel', {
            store: summaryStore,
            height: 85,
            forceFit: true,
            viewConfig: {
                //stripeRows: true,
                enableTextSelection: true
            },
            columns: [{
                text: 'Start Items',
                flex: 1,
                columns: [{
                    text: 'Total Count',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCount'
                }, {
                    text: 'Total Estimate',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimate'
                }, {
                    text: 'Total Count Removed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountRemoved'
                }, {
                    text: 'Total Estimate Removed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimateRemoved'
                }]
            }, {
                text: 'End Items',
                columns: [{
                    text: 'Total Count',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountEnd'
                }, {
                    text: 'Total Estimate',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimateEnd'
                }, {
                    text: 'Total Count Added',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountAdded'
                }, {
                    text: 'Total Estimate Added',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimateAdded'
                }, {
                    text: 'Total Count Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountCompleted'
                }, {
                    text: 'Total Estimate Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimateCompleted'
                }, {
                    text: 'Total Count Not Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountNotCompleted'
                }, {
                    text: 'Total Estimate Not Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimateNotCompleted'
                }]
            }]
        });

        this.down('#summaryPanel').removeAll(true);
        this.down('#summaryPanel').add(summaryGrid);
    }
});