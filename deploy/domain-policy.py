#!/usr/bin/env python3
"""Read-only DNS gate before creating any HTTPS routers or ACME orders."""
import argparse
import ipaddress
import json
import re
import shlex
import subprocess
import sys

EXPECTED_IP = '179.66.135.203'
NAMESERVERS = {'osmar.ns.cloudflare.com', 'sharon.ns.cloudflare.com'}
RESOLVERS = ['1.1.1.1', '8.8.8.8']


class DomainError(Exception):
    pass


def validate_domain(domain):
    labels = domain.split('.')
    if len(domain) > 253 or len(labels) < 2 or domain.startswith('www.') or not labels[-1].isalpha():
        raise DomainError('Use the lowercase canonical domain without protocol, www, port or path.')
    if any(not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', label) for label in labels):
        raise DomainError('Invalid canonical domain.')
    return domain


def query(server, domain, kind):
    result = subprocess.run(['dig', '@' + server, domain, kind, '+noall', '+comments', '+answer', '+time=3', '+tries=1'], capture_output=True, text=True, timeout=6, check=False)
    if result.returncode:
        raise DomainError('A required DNS resolver did not respond; no certificate will be requested.')
    status = re.search(r'status: ([A-Z]+)', result.stdout)
    if not status or status[1] not in {'NOERROR', 'NXDOMAIN'} or (kind == 'CAA' and status[1] != 'NOERROR'):
        raise DomainError('DNS validation failed; check delegation and DNSSEC before requesting a certificate.')
    records = []
    for line in result.stdout.splitlines():
        if not line.strip() or line.startswith(';'):
            continue
        fields = line.split(None, 4)
        if len(fields) == 5 and fields[3] == kind:
            records.append(fields[4])
    return records


def addresses(records, version):
    found = set()
    for value in records:
        try:
            address = ipaddress.ip_address(value)
        except ValueError:
            continue  # dig also returns a CNAME before the final address.
        if address.version == version:
            found.add(str(address))
    return found


def caa_allows_http01(records):
    issuers = []
    for record in records:
        try:
            flag, tag, value = shlex.split(record)
            flag = int(flag)
        except (ValueError, TypeError):
            raise DomainError('CAA response needs manual review.') from None
        if flag & 128 and tag not in {'issue', 'issuewild', 'iodef'}:
            return False
        if tag != 'issue':
            continue
        fields = [part.strip() for part in value.split(';')]
        permitted = fields[0].lower() == 'letsencrypt.org'
        for field in fields[1:]:
            if not field:
                continue
            key, separator, setting = field.partition('=')
            if not separator or key != 'validationmethods' or 'http-01' not in setting.split(','):
                permitted = False
        issuers.append(permitted)
    return not issuers or any(issuers)


def check_dns(domain, lookup=query):
    validate_domain(domain)
    problems = []
    observations = []
    hosts = [domain, 'www.' + domain]
    for server in RESOLVERS + sorted(NAMESERVERS):
        ns = {value.rstrip('.').lower() for value in lookup(server, domain, 'NS')}
        if ns != NAMESERVERS:
            problems.append('Nameserver delegation is not ready on ' + server + '.')
        for host in hosts:
            ipv4 = addresses(lookup(server, host, 'A'), 4)
            ipv6 = addresses(lookup(server, host, 'AAAA'), 6)
            observations.append({'resolver': server, 'host': host, 'ipv4': sorted(ipv4), 'hasIPv6': bool(ipv6)})
            if ipv4 != {EXPECTED_IP}:
                problems.append('IPv4 does not resolve exclusively to this VPS: ' + host + ' on ' + server + '.')
            if ipv6:
                problems.append('IPv6 has not been validated for HTTPS: ' + host + '.')
    if not problems:
        # CAA inherits from the nearest ancestor with records; www may override it.
        for host in hosts:
            labels = host.split('.')
            for index in range(len(labels)):
                records = lookup(RESOLVERS[0], '.'.join(labels[index:]), 'CAA')
                if records:
                    records = [record for record in records if re.match(r'^\d+\s', record)]
                    if not records:
                        continue
                    if not caa_allows_http01(records):
                        problems.append('CAA does not permit the configured Let\'s Encrypt HTTP-01 workflow: ' + host + '.')
                    break
    return {'domain': domain, 'www': hosts[1], 'expectedIPv4': EXPECTED_IP, 'ready': not problems, 'problems': problems, 'observations': observations}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('domain')
    args = parser.parse_args()
    try:
        result = check_dns(args.domain)
        print(json.dumps(result))
        raise SystemExit(0 if result['ready'] else 2)
    except (DomainError, OSError, subprocess.SubprocessError) as error:
        print(str(error) if isinstance(error, DomainError) else 'DNS readiness could not be verified; HTTPS remains unchanged.', file=sys.stderr)
        raise SystemExit(2) from None
