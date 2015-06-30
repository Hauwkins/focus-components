// Dependencies

let builder = require('focus').component.builder;
let omit = require('lodash/object/omit');
let map = require('lodash/collection/map');
let reduce = require('lodash/collection/reduce');
let clone = require('lodash/lang/clone');
let keys = require('lodash/object/keys');
let forEach = require('lodash/collection/forEach');
let isEqual = require('lodash/lang/isEqual');

// Components

let DefaultEmpty = require('./default-empty-component');
let ListSelection = require('../../../../list/selection').list.component;
let GroupWrapper = require('./group-wrapper').component;

// Mixins

let i18nMixin = require('../../../../common/i18n/mixin');

/**
 * Results component, used to render the results, grouped or ungrouped
 * @type {Object}
 */
let Results = {
    mixins: [i18nMixin],
    /**
     * By default, an empty component is picked.
     * @return {Object} the default props
     */
    getDefaultProps() {
        return {
            emptyComponent: DefaultEmpty,
            renderSingleGroupDecoration: true,
            initialRowsCount: 3,
            showMoreAdditionalRows: 5,
            scopeFacetKey: 'FCT_SCOPE',
            action: undefined,
            resultsMap: undefined,
            totalCount: undefined,
            groupComponent: undefined,
            lineComponentMapper: undefined,
            idField: undefined,
            isSelection: undefined,
            lineSelectionHandler: undefined,
            lineClickHandler: undefined,
            lineOperationList: undefined,
            scrollParentSelector: undefined,
            selectionStatus: undefined,
            groupingKey: undefined,
            resultsFacets: undefined
        };
    },
    getInitialState() {
        return ({
            loading: false
        });
    },
    componentWillReceiveProps() {
        if (this.state.loading) {
            this.setState({
                loading: false
            });
        }
    },

    /**
     * Render a single group of results, using the group component given as a prop.
     * @param  {array} list the results list
     * @param  {string} key  the group key
     * @param  {int} count  the group's results count
     * @param  {bool} isUnique  is this the only rendered group
     * @return {HMTL}      the rendered group
     */
    _renderSingleGroup(list, key, count, isUnique) {
        if (isUnique) {
            if (this.props.renderSingleGroupDecoration) {
                return (
                    <GroupWrapper
                        count={count}
                        groupComponent={this.props.groupComponent}
                        isUnique={true}
                        groupKey={key}
                        list={list}
                        renderResultsList={this._renderResultsList}
                    />
                );
            } else {
                return this._renderResultsList(list, key, count, true);
            }
        } else {
            return (
                <GroupWrapper
                    count={count}
                    groupComponent={this.props.groupComponent}
                    groupKey={key}
                    list={list}
                    renderResultsList={this._renderResultsList}
                    showAllHandler={this._showAllHandler}
                />
            );
        }
    },
    /**
     * Render the empty component given as a prop when the result map is empty.
     * @return {HMTL}      the rendered component
     */
    _renderEmptyResults() {
        return <this.props.emptyComponent/>;
    },
    /**
     * Render the results list
     * @param  {Array}  list     the results list
     * @param  {string}  key      the group key
     * @param  {integer}  count    the group count
     * @param  {Boolean} isUnique true if this is the only group rendered
     * @return {HTML}          the rendered component
     */
    _renderResultsList(list, key, count, isUnique) {
        let LineComponent = this.props.lineComponentMapper(key, list);
        let hasMoreData = isUnique !== undefined && isUnique && list.length <= count;
        return (
            <div>
                <ListSelection
                    data-focus='results-list'
                    data={list}
                    idField={this.props.idField}
                    isSelection={this.props.isSelection}
                    onSelection={this.props.lineSelectionHandler}
                    onLineClick={this.props.lineClickHandler}
                    fetchNextPage={this._onScrollReachedBottom}
                    hasMoreData={hasMoreData}
                    operationList={this.props.lineOperationList}
                    lineComponent={LineComponent}
                    parentSelector={this.props.scrollParentSelector}
                    selectionStatus={this.props.selectionStatus}
                />
                {this.state.loading &&
                    <div data-focus='loading-more-results'>
                        <i className='fa fa-spinner'></i>
                        {this.i18n('search.loadingMore')}
                    </div>
                }
            </div>
        );
    },
    
    /**
     * Construct the show all action
     * @param  {string} key the group key where the show all has been clicked
     * @return {function}     the show all handler
     */
    _showAllHandler(key) {
        if (this.props.resultsFacets[this.props.scopeFacetKey]) {
            this._scopeSelectionHandler(key);
        } else {
            let facetKey = this.props.groupingKey;
            let facetValue = key;
            this._facetSelectionHandler({
                [facetKey]: facetValue
            });
        }
    },
    /**
     * Construct the show more handler
     * @param  {string} key the group key where the show more has been clicked
     * @return {function}     the show more handler
     */
    _getShowMoreHandler(key) {
        return () => {
            let groupsRowsCounts = clone(this.state.groupsRowsCounts);
            groupsRowsCounts[key] = groupsRowsCounts[key] ? groupsRowsCounts[key] + this.props.showMoreAdditionalRows : this.props.initialRowsCount;
            this.setState({groupsRowsCounts});
        };
    },
    /**
     * Get the group counts object
     * @param  {object} resultsMap the results map
     * @return {object}           the counts map
     */
    _getGroupCounts(resultsMap) {
        let groupKeys = keys(resultsMap);
        if (groupKeys.length === 1) {
            return {
                [groupKeys[0]]: {
                    count: this.props.totalCount
                }
            };
        }
        let targetFacetData;
        forEach(this.props.resultsFacets, (facetData) => {
            if (isEqual(keys(facetData).sort(), groupKeys.sort())) {
                targetFacetData = facetData;
                return false;
            }
        });
        return reduce(targetFacetData, (result, data, key) => {
            result[key] = data.count;
            return result;
        }, {});
    },
    /**
     * Scope selection handler
     * @param  {string} key the scope key
     */
    _scopeSelectionHandler(key) {
        this.props.action.updateProperties({
            scope: key
        });
    },
    /**
     * Facet selection handler
     * @param  {string} key the facet key
     */
    _facetSelectionHandler(key) {
        this.props.action.updateProperties({
            groupingKey: key
        });
    },
    /**
     * Scroll reached bottom handler
     */
    _onScrollReachedBottom() {
        if (!this.state.loading) {
            this.setState({
                loading: true
            }, () => {
                this.props.action.search(true);
            });
        }

    },
    /**
     * Render the whole component
     * @return {HMTL}      the rendered component
     */
    render() {
        // If there is no result, render the given empty component
        if (this.props.totalCount === 0) {
            return this._renderEmptyResults();
        }
        // Filter groups with no results
        let resultsMap = omit(this.props.resultsMap, (list) => {
            return list.length === 0;
        });
        // Get the count for each group
        let groupCounts = this._getGroupCounts(this.props.resultsMap);
        // Check if there is only one group left
        if (keys(resultsMap).length === 1) {
            let key = keys(resultsMap)[0];
            let list = resultsMap[key];
            let count = groupCounts[key].count;
            return this._renderSingleGroup(list, key, count, true);
        } else {
            return (
                <div data-focus='search-results'>
                    {map(resultsMap, (list, key) => {
                        let count = groupCounts[key];
                        return this._renderSingleGroup(list, key, count);
                    })}
                </div>
            );
        }
    }
};

module.exports = builder(Results);
