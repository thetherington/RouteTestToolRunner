"""script to fetch slab logs from the magnum analytics server"""

import argparse
import json
import sys
import urllib
import urllib.parse
from typing import Any, Dict, List, Literal, NotRequired, TypedDict, Union, Unpack

import requests

# suppress stack traces since they're not needed by the runner
sys.tracebacklimit = 0

HitsItem = Union[Dict[str, "HitsItem"]]


class ErrorMissingLogs(Exception):
    """Exception for no logs founds"""


class RouterMapEntry(TypedDict):
    """Router map entry"""

    eng: str
    dst: int
    slabs: List[str]


class SlabLogSearchParams(TypedDict):
    """SlabLogSearch initialization parameters"""

    map: Dict[str, RouterMapEntry]
    mcast: str
    analytics_address: NotRequired[str]


class ShardsDict(TypedDict):
    """Represents metadata about the shard execution state in an Elasticsearch search response."""

    total: int
    successful: int
    skipped: int
    failed: int


class TotalDict(TypedDict):
    """Represents the total number of hits information within a search result."""

    value: int
    relation: Literal["eq"]


class HitsDict(TypedDict):
    """Encapsulates the main search results within the 'hits' section of the response."""

    total: TotalDict
    max_score: float
    hits: List[HitsItem]


class ElasticsearchResponse(TypedDict):
    """Complete structure of an Elasticsearch search response object."""

    took: int
    timed_out: bool
    _shards: ShardsDict
    hits: HitsDict


class SlabLogSearch:
    """Class to search for logs and print to the console"""

    def __init__(self, **kwargs: Unpack[SlabLogSearchParams]) -> None:
        self.mcast: str = ""
        self.router_map: Dict[str, RouterMapEntry] = {}

        analytics_address = "127.0.0.1"
        analytics_port = 9200
        analytics_proto = "http"

        index = "<log-syslog-error-{now/d}>,<log-syslog-error-{now/d-1d}>"

        for key, value in kwargs.items():
            if key == "map":
                if isinstance(value, dict):
                    self.router_map = value

            if key == "mcast":
                self.mcast = str(value)

            if "analytics" in key and value:
                analytics_address = value

        # make the url "http://IP:PORT"
        analytics_url = f"{analytics_proto}://{analytics_address}:{analytics_port}"

        # make the search url with safe url characters "http://IP:PORT/INDEX/_search"
        self.search_url = (
            f'{analytics_url}/{urllib.parse.quote(index, safe="")}/_search'
        )

    def query(self, slab: str, dst: int, mcast: str) -> Dict[str, Any]:
        """query used to find the slab logs"""

        search_query = {
            "size": 10000,
            "query": {
                "bool": {
                    "filter": [
                        {
                            "bool": {
                                "must": [
                                    {
                                        "multi_match": {
                                            "type": "best_fields",
                                            "query": "exnmos",
                                            "lenient": True,
                                        }
                                    },
                                    {
                                        "multi_match": {
                                            "type": "phrase",
                                            "query": f"LWRP_DST_{dst}",
                                            "lenient": True,
                                        }
                                    },
                                    {
                                        "multi_match": {
                                            "type": "phrase",
                                            "query": mcast,
                                            "lenient": True,
                                        }
                                    },
                                ]
                            }
                        },
                        {"range": {"@timestamp": {"from": "now-5m", "to": "now"}}},
                        {"match_phrase": {"annotation.general.device_name": slab}},
                    ]
                }
            },
            "_source": ["log.syslog.message"],
        }

        return search_query

    def fetch(self, query: Dict[str, Any]) -> List[str]:
        """fetches logs from elasticsearch via the rest api query"""

        headers = {"Content-Type": "application/json"}
        params = {"ignore_unavailable": "true"}

        resp = requests.get(
            self.search_url,
            headers=headers,
            params=params,
            data=json.dumps(query),
            timeout=30.0,
        )
        resp.close()

        response: ElasticsearchResponse = json.loads(resp.text)

        if response["hits"]["total"]["value"] == 0:
            raise ErrorMissingLogs("No logs found")

        logs = []
        for doc in response["hits"]["hits"]:
            logs.append(doc["_source"]["log"]["syslog"]["message"])

        return logs

    def print(self) -> None:
        """print logs to the console"""
        missing_logs = 0
        print(f"\nSource DCZA026A (multicast: {self.mcast}):")

        for dst in self.router_map:
            entry = self.router_map[dst]

            eng = entry["eng"]
            output = entry["dst"]

            print(f"\nDestination {dst} (eng: {eng}):")

            for slab in entry["slabs"]:
                print(f"\tSlab Logs for {slab} (DST: {output}):")

                try:
                    for log in self.fetch(
                        self.query(slab=slab, dst=output, mcast=self.mcast)
                    ):
                        print(f"\t\t{log}")

                except ErrorMissingLogs as exc:
                    print(f"\t\tError: {exc}")
                    missing_logs += 1
                    continue

        print("\n\n")
        if missing_logs > 0:
            raise ErrorMissingLogs(f"Total slabs missing logs: {missing_logs}")


def load_router_map(file_path: str) -> Dict[str, Any]:
    """Load the router map from a JSON file."""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            router_map = json.load(file)

        return router_map

    except FileNotFoundError:
        print(f"Error: The file {file_path} was not found.")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: The file {file_path} is not a valid JSON file.")
        sys.exit(1)


def main() -> None:
    """main function called when executed from the command line"""

    args_parser = argparse.ArgumentParser(description="Telos Slab Log Searcher")

    args_parser.add_argument(
        "-map",
        "--router-map",
        required=True,
        type=str,
        metavar="<routermap.json>",
        default="routermap.json",
        help="Router Map JSON file",
    )
    args_parser.add_argument(
        "-mcast",
        "--ip-mcast-source",
        required=True,
        type=str,
        metavar="<239.1.1.1>",
        help="IP Multicast Source",
    )
    args_parser.add_argument(
        "-insite",
        "--analytics-ip",
        required=False,
        type=str,
        metavar="<127.0.0.1>",
        default="127.0.0.1",
        help="Multicast address",
    )

    args = args_parser.parse_args()

    params: SlabLogSearchParams = {
        "mcast": args.ip_mcast_source,
        "map": load_router_map(args.router_map),
        "analytics_address": args.analytics_ip,
    }

    SlabLogSearch(**params).print()


if __name__ == "__main__":
    main()
