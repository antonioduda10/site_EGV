"""Read-only HTTP and container checks shared by operational scripts."""

import json
import subprocess
import time
import urllib.error
import urllib.request

from bluegreen_policy import DOMAIN


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_status(url, host=None):
    request = urllib.request.Request(url, headers={"User-Agent": "PortalEGV-bluegreen-validation/1.0", **({"Host": host} if host else {})})
    try:
        response = urllib.request.build_opener(NoRedirect()).open(request, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status


def inspect(name, field):
    result = subprocess.run(["docker", "inspect", "--format", "{{json " + field + "}}", name], capture_output=True, text=True, timeout=20)
    if result.returncode:
        raise ValueError("Expected application infrastructure is unavailable")
    return json.loads(result.stdout)


def wait_for(test, seconds):
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        if test():
            return
        time.sleep(1)
    raise ValueError("Timed out waiting for a verified routing state")


def public_checks(include_new_module=True):
    result = {}
    for path in ("/", "/noticias", "/eventos", "/documentos", "/galeria", "/galeria/fotos", "/galeria/videos", "/secretaria", "/contato", "/login", "/sitemap.xml", "/robots.txt"):
        result[path] = request_status("https://" + DOMAIN + path)
        if result[path] != 200:
            raise ValueError("Public page failed validation")
    protected = ["/dashboard", "/dashboard/config", "/dashboard/usuarios"]
    if include_new_module:
        protected.append("/dashboard/avisos")
    for path in protected:
        result[path] = request_status("https://" + DOMAIN + path)
        if result[path] != 307:
            raise ValueError("Anonymous administrative access was not rejected")
    return result
