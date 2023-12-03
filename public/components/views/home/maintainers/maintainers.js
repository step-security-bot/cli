// Import Internal Dependencies
import * as utils from "../../../../common/utils.js";
import { createExpandableSpan } from "../../../expandable/expandable.js";
import { PopupTemplate } from "../../../popup/popup.js";

export class Maintainers {
  static whois(name, email) {
    const childs = [
      utils.createDOMElement("p", { text: name })
    ];
    if (typeof email === "string") {
      childs.push(utils.createDOMElement("span", { text: email }));
    }

    return utils.createDOMElement("div", {
      className: "whois", childs
    });
  }

  constructor(secureDataSet, nsn, options = {}) {
    const { maximumMaintainers = 5 } = options;

    this.secureDataSet = secureDataSet;
    this.nsn = nsn;
    this.maximumMaintainers = maximumMaintainers;
  }

  render() {
    const authors = [...this.secureDataSet.authors.entries()]
      .sort((left, right) => right[1].packages.size - left[1].packages.size);

    document.getElementById("authors-count").innerHTML = authors.length;
    document.querySelector(".home--maintainers")
      .appendChild(this.generate(authors));
  }

  generate(authors) {
    const fragment = document.createDocumentFragment();
    const hideItems = authors.length > this.maximumMaintainers;

    for (let id = 0; id < authors.length; id++) {
      const [name, data] = authors[id];
      if (typeof name === "undefined") {
        continue;
      }
      const { packages, email, url = null } = data;

      const hasURL = typeof url === "string";
      const person = utils.createDOMElement("div", {
        className: "person",
        childs: [
          utils.createAvatarImageElement(email),
          Maintainers.whois(name, email),
          hasURL ? utils.createDOMElement("i", { className: "icon-link" }) : null,
          utils.createDOMElement("div", {
            className: "packagescount",
            childs: [
              utils.createDOMElement("i", { className: "icon-cube" }),
              utils.createDOMElement("p", { text: packages.size })
            ]
          })
        ]
      });
      if (hideItems && id >= this.maximumMaintainers) {
        person.classList.add("hidden");
      }
      person.addEventListener("click", () => {
        window.popup.open(
          new PopupMaintainer(name, data, this.nsn).render()
        );
      });

      fragment.appendChild(person);
    }
    if (hideItems) {
      fragment.appendChild(createExpandableSpan(this.maximumMaintainers));
    }

    return fragment;
  }
}

export class PopupMaintainer {
  constructor(name, data, nsn) {
    this.name = name;
    this.data = data;
    this.nsn = nsn;
  }

  render() {
    const { email, url = null } = this.data;

    const templateElement = document.getElementById("maintainers-popup-template");
    /** @type {HTMLElement} */
    const clone = templateElement.content.cloneNode(true);

    clone.querySelector(".avatar").appendChild(
      utils.createAvatarImageElement(email)
    );
    clone.querySelector(".name").textContent = this.name;
    const emailElement = clone.querySelector(".email");

    if (typeof email === "string") {
      emailElement.textContent = email;
    }
    else {
      emailElement.style.display = "none";
    }

    const linkElement = clone.querySelector(".icon-link");
    if (typeof url === "string") {
      linkElement.addEventListener("click", () => window.open(url, "_blank"));
    }
    else {
      linkElement.style.display = "none";
    }

    const focusGlobElement = clone.querySelector(".icon-globe-alt-outline");
    focusGlobElement.addEventListener("click", () => {
      window.popup.close();
      window.navigation.setNavByName("network--view");
    });

    this.generatePackagesList(clone);

    return new PopupTemplate(
      "maintainer",
      clone
    );
  }

  /**
   * @param {!HTMLElement} clone
   */
  generatePackagesList(clone) {
    const fragment = document.createDocumentFragment();

    for (const spec of this.data.packages) {
      const { name, version } = this.parseNpmSpec(spec);

      const iconNetwork = utils.createDOMElement("i", {
        className: "icon-right-open-big"
      });
      iconNetwork.addEventListener("click", () => {
        window.popup.close();
        window.navigation.setNavByName("network--view");
        setTimeout(() => this.nsn.focusNodeByName(name), 25);
      });

      fragment.appendChild(
        utils.createDOMElement("li", {
          childs: [
            utils.createDOMElement("p", { text: name }),
            utils.createDOMElement("span", { text: `v${version}` }),
            iconNetwork
          ]
        })
      );
    }

    clone.querySelector(".maintainers--packages")
      .appendChild(fragment);
  }

  parseNpmSpec(spec) {
    const parts = spec.split("@");

    return spec.startsWith("@") ?
      { name: `@${parts[1]}`, version: parts[2] } :
      { name: parts[0], version: parts[1] };
  }
}
