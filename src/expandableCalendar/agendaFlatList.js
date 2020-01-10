import _ from 'lodash';
import React, {Component} from 'react';
import {SectionList, Text, FlatList} from 'react-native';
import PropTypes from 'prop-types';
import XDate from 'xdate';

import styleConstructor from './style';
import asCalendarConsumer from './asCalendarConsumer';

const commons = require('./commons');
const UPDATE_SOURCES = commons.UPDATE_SOURCES;

/**
 * @description: AgendaList component
 * @extends: SectionList
 * @notes: Should be wraped in CalendarProvider component
 * @example: https://github.com/wix/react-native-calendars/blob/master/example/src/screens/expandableCalendar.js
 */
class AgendaFlatList extends Component {
  static displayName = 'AgendaFlatList';

  static propTypes = {
    ...FlatList.propTypes,
    /** day format in section title. Formatting values: http://arshaw.com/xdate/#Formatting */
    dayFormat: PropTypes.string,
    /** style passed to the section view */
    sectionStyle: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.number,
      PropTypes.array,
    ]),
    // Height of item section
    sectionHeight: PropTypes.number,
    itemHeight: PropTypes.number,
    // Required: Object property of data item that has date with format of dayFormat
    dataDateProperty: PropTypes.string,
  };

  static defaultProps = {
    dayFormat: 'dddd, MMM d',
    sectionHeight: 0,
    itemHeight: 0,
    dataDateProperty: 'date',
  };

  constructor(props) {
    super(props);
    this.style = styleConstructor(props.theme);

    const dataDateProperty = this.props.dataDateProperty;
    this._topSection = _.get(props, `data[0][${dataDateProperty}]`);
    this.didScroll = false;
    this.sectionScroll = false;

    this.viewabilityConfig = {
      itemVisiblePercentThreshold: 20, // 50 means if 50% of the item is visible
    };
    this.list = React.createRef();
  }

  getSectionIndex(date) {
    let i;
    _.map(this.props.data, (data, index) => {
      // NOTE: sections titles should match current date format!!!
      if (data[this.props.dataDateProperty] === date) {
        i = index;
        return;
      }
    });
    return i;
  }

  componentDidMount() {
    const {date} = this.props.context;
    if (date !== this.props.data[0][this.props.dataDateProperty]) {
      const sectionIndex = this.getSectionIndex(date);
      setTimeout(() => {
        this.scrollToSection(sectionIndex);
      });
    }
  }

  componentDidUpdate(prevProps) {
    const {updateSource, date} = this.props.context;
    if (date !== prevProps.context.date) {
      // NOTE: on first init data should set first section to the current date!!!
      if (
        updateSource !== UPDATE_SOURCES.LIST_DRAG &&
        updateSource !== UPDATE_SOURCES.CALENDAR_INIT
      ) {
        const sectionIndex = this.getSectionIndex(date);
        this.scrollToSection(sectionIndex);
      }
    }
  }

  scrollToSection(sectionIndex) {
    if (this.list.current && sectionIndex !== undefined) {
      this.sectionScroll = true; // to avoid setDate() in onViewableItemsChanged
      this._topSection = this.props.data[sectionIndex][
        this.props.dataDateProperty
      ];

      this.list.current.scrollToIndex({
        animated: true,
        index: sectionIndex,
        viewPosition: 0,
      });
    }
  }

  onViewableItemsChanged = ({viewableItems}) => {
    if (viewableItems && !this.sectionScroll) {
      const dataDateProperty = this.props.dataDateProperty;
      const topSection = _.get(viewableItems[0], `item[${dataDateProperty}]`);
      if (topSection && topSection !== this._topSection) {
        this._topSection = topSection;
        if (this.didScroll) {
          // to avoid setDate() on first load (while setting the initial context.date value)
          _.invoke(
            this.props.context,
            'setDate',
            this._topSection,
            UPDATE_SOURCES.LIST_DRAG,
          );
        }
      }
    }
  };

  onScroll = event => {
    if (!this.didScroll) {
      this.didScroll = true;
    }
    _.invoke(this.props, 'onScroll', event);
  };

  onMomentumScrollBegin = event => {
    _.invoke(this.props.context, 'setDisabled', true);
    _.invoke(this.props, 'onMomentumScrollBegin', event);
  };

  onMomentumScrollEnd = event => {
    // when list momentum ends AND when scrollToSection scroll ends
    this.sectionScroll = false;
    _.invoke(this.props.context, 'setDisabled', false);
    _.invoke(this.props, 'onMomentumScrollEnd', event);
  };

  keyExtractor = (item, index) => String(index);

  render() {
    return (
      <FlatList
        {...this.props}
        ref={this.list}
        keyExtractor={this.keyExtractor}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={this.onViewableItemsChanged}
        viewabilityConfig={this.viewabilityConfig}
        onScroll={this.onScroll}
        onMomentumScrollBegin={this.onMomentumScrollBegin}
        onMomentumScrollEnd={this.onMomentumScrollEnd}
        // onScrollToIndexFailed={(info) => { console.warn('onScrollToIndexFailed info: ', info); }}
        //getItemLayout={this.getItemLayout} // onViewableItemsChanged is not updated when list scrolls!!!
      />
    );
  }

  // getItemLayout = (data, index) => {
  //   return {length: commons.screenWidth, offset: commons.screenWidth  * index, index};
  // }
}

export default asCalendarConsumer(AgendaFlatList);
