"""script to fetch slab logs from the magnum analytics server"""

import argparse
import json
import sys
import time
import urllib
import urllib.parse
from typing import Dict, List, Literal, NotRequired, Self, TypedDict, Union, Unpack

import requests

# suppress stack traces since they're not needed by the runner
sys.tracebacklimit = 0

HitsItem = Union[Dict[str, "HitsItem"]]


class ErrorMissingLogs(Exception):
    """Exception for no logs founds"""


class SlabLogSearchParams(TypedDict):
    """SlabLogSearch initialization parameters"""

    slab: NotRequired[str]
    dst: NotRequired[str]
    mcast: NotRequired[str]
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
        self.logs = []
        self.slab = "iad1bc-slab001"
        self.dst = "1"
        self.mcast = "239.0.0.1"

        analytics_address = "127.0.0.1"
        analytics_port = 9200
        analytics_proto = "http"

        index = "<log-syslog-error-{now/d}>,<log-syslog-error-{now/d-1d}>"

        for key, value in kwargs.items():
            if "slab" in key and value:
                self.slab = value

            if "dst" in key and value:
                self.dst = value

            if "mcast" in key and value:
                self.mcast = value

            if "analytics" in key and value:
                analytics_address = value

        # make the url "http://IP:PORT"
        analytics_url = f"{analytics_proto}://{analytics_address}:{analytics_port}"

        # make the search url with safe url characters "http://IP:PORT/INDEX/_search"
        self.search_url = (
            f'{analytics_url}/{urllib.parse.quote(index, safe="")}/_search'
        )

        self.search_query = {}

    def query(self) -> Self:
        """query used to find the slab logs"""

        self.search_query = {
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
                                            "query": "LwrpUpdated",
                                            "lenient": True,
                                        }
                                    },
                                    {
                                        "multi_match": {
                                            "type": "phrase",
                                            "query": f"DST {self.dst}",
                                            "lenient": True,
                                        }
                                    },
                                    {
                                        "multi_match": {
                                            "type": "phrase",
                                            "query": self.mcast,
                                            "lenient": True,
                                        }
                                    },
                                ]
                            }
                        },
                        {"range": {"@timestamp": {"from": "now-5m", "to": "now"}}},
                        {"match_phrase": {"annotation.general.device_name": self.slab}},
                    ]
                }
            },
            "_source": ["log.syslog.message"],
        }

        return self

    def fetch(self) -> Self:
        """fetches logs from elasticsearch via the rest api query"""

        headers = {"Content-Type": "application/json"}
        params = {"ignore_unavailable": "true"}

        resp = requests.get(
            self.search_url,
            headers=headers,
            params=params,
            data=json.dumps(self.search_query),
            timeout=30.0,
        )
        resp.close()

        response: ElasticsearchResponse = json.loads(resp.text)

        if response["hits"]["total"]["value"] == 0:
            raise ErrorMissingLogs("No logs found")

        logs = []
        for doc in response["hits"]["hits"]:
            logs.append(doc["_source"]["log"]["syslog"]["message"])

        self.logs = logs

        return self

    def print(self) -> None:
        """print logs to the console"""

        for log in self.logs:
            print(log)


def dummy_out():
    """Set delay between lines in seconds (adjust as needed)"""
    delay_seconds = 2

    lines = ["1", "-----", "2", "3", "4", "5", "6", "7"]

    for line in lines:
        print(line)
        time.sleep(delay_seconds)


def main() -> None:
    """main function called when executed from the command line"""

    args_parser = argparse.ArgumentParser(description="Telos Slab Log Searcher")

    args_parser.add_argument(
        "-slab",
        "--slab-name",
        required=False,
        type=str,
        metavar="<iad1bc-slab001>",
        default="iad1bc-slab001",
        help="Slab device name",
    )
    args_parser.add_argument(
        "-dst",
        "--slab-output",
        required=False,
        type=str,
        metavar="<1>",
        default="1",
        help="Slab Output",
    )
    args_parser.add_argument(
        "-mcast",
        "--multicast",
        required=False,
        type=str,
        metavar="<239.0.0.1>",
        default="239.0.0.1",
        help="Multicast address",
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
        "slab": args.slab_name,
        "dst": args.slab_output,
        "mcast": args.multicast,
        "analytics_address": args.analytics_ip,
    }

    SlabLogSearch(**params).query().fetch().print()


if __name__ == "__main__":
    main()
