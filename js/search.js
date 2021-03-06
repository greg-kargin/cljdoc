import { Component, render, h } from "preact";
import * as listSelect from "./listselect";

function debounced(delay, fn) {
  let timerId;
  return function(...args) {
    if (timerId) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      fn(...args);
      timerId = null;
    }, delay);
  };
}

function cleanSearchStr(str) {
  // replace square and curly brackets in case people copy from
  // Leiningen/Boot files or deps.edn
  return str.replace(/[\{\}\[\]\"]+/g, "");
}

const loadResults = (str, cb) => {
  const uri = "https://clojars.org/search?q=" + str + "&format=json";
  fetch(uri)
    .then(response => response.json())
    .then(json => cb(json.results));
};

class SearchInput extends Component {
  onKeyDown(e) {
    if (e.which === 13) {
      this.props.onEnter();
    } else if (e.which === 27) {
      this.props.unfocus();
    } else if (e.which === 38) {
      // arrow up
      e.preventDefault(); // prevents caret from moving in input field
      this.props.onArrowUp();
    } else if (e.which === 40) {
      // arrow down
      e.preventDefault();
      this.props.onArrowDown();
    }
  }

  render(props) {
    const debouncedLoader = debounced(300, loadResults);
    return h("input", {
      autofocus: true,
      placeHolder: "NEW! Jump to docs...",
      className: "pa2 w-100 br1 border-box b--blue ba input-reset",
      onFocus: e => props.focus(),
      onBlur: e => setTimeout(_ => props.unfocus(), 200),
      onKeyDown: e => this.onKeyDown(e),
      onInput: e =>
        debouncedLoader(
          cleanSearchStr(e.target.value),
          props.newResultsCallback
        )
    });
  }
}

function resultUri(result) {
  return (
    "/d/" + result.group_name + "/" + result.jar_name + "/" + result.version
  );
}

const SingleResultView = (r, isSelected, selectResult) => {
  const project =
    r.group_name === r.jar_name
      ? r.group_name
      : r.group_name + "/" + r.jar_name;
  const docsUri = resultUri(r);
  return h("a", { className: "no-underline black", href: docsUri }, [
    h(
      "div",
      {
        className: isSelected
          ? "pa3 bb b--light-gray bg-light-blue"
          : "pa3 bb b--light-gray",
        onMouseOver: selectResult
      },
      [
        h("h4", { className: "dib ma0" }, [
          project,
          h("span", { className: "ml2 gray normal" }, r.version)
        ]),
        h(
          "a",
          {
            className: "link blue ml2",
            href: docsUri
          },
          "view docs"
        )
        // h('span', {}, r.created)
      ]
    )
  ]);
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { results: [], focused: false, selectedIndex: 0 };
  }

  render(props, state) {
    function resultsView(parent) {
      return h(
        "div",
        {
          className:
            "bg-white br1 br--bottom bb bl br b--blue w-100 absolute overflow-y-scroll",
          style: {
            top: "2.3rem",
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
          }
        },
        h(listSelect.ResultsView, {
          resultView: SingleResultView,
          results: state.results,
          selectedIndex: state.selectedIndex,
          onMouseOver: idx => parent.setState({ selectedIndex: idx })
        })
      );
    }

    return h("div", { className: "relative system-sans-serif" }, [
      h(SearchInput, {
        newResultsCallback: rs =>
          this.setState({ focused: true, results: rs, selectedIndex: 0 }),
        onEnter: () =>
          window.open(
            resultUri(this.state.results[this.state.selectedIndex]),
            "_self"
          ),
        onArrowUp: () =>
          this.setState({
            selectedIndex: Math.max(this.state.selectedIndex - 1, 0)
          }),
        onArrowDown: () =>
          this.setState({
            selectedIndex: Math.min(
              this.state.selectedIndex + 1,
              this.state.results.length - 1
            )
          }),
        focus: () => this.setState({ focused: true }),
        unfocus: () => this.setState({ focused: false })
      }),
      state.focused && state.results.length > 0 ? resultsView(this) : null
    ]);
  }
}

export { App };
